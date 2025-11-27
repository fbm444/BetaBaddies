import { google } from "googleapis";
import database from "./database.js";
import professionalContactService from "./professionalContactService.js";

class GoogleContactsService {
  constructor() {
    this.scopes = [
      "https://www.googleapis.com/auth/contacts.readonly",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
    ];
    this.defaultImportLimit = 250;
    this.maxImportLimit = 1000;
  }

  get redirectUri() {
    return (
      process.env.GOOGLE_CONTACTS_CALLBACK_URL ||
      `${process.env.BACKEND_URL || process.env.SERVER_URL || "http://localhost:3001"}/api/v1/network/google-contacts/auth/callback`
    );
  }

  getOAuthClient() {
    const clientId =
      process.env.GOOGLE_CONTACTS_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
    const clientSecret =
      process.env.GOOGLE_CONTACTS_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error(
        "Missing Google Contacts client credentials. Set GOOGLE_CONTACTS_CLIENT_ID and GOOGLE_CONTACTS_CLIENT_SECRET."
      );
    }

    return new google.auth.OAuth2(
      clientId,
      clientSecret,
      this.redirectUri
    );
  }

  getAuthorizationUrl(userId) {
    const oauth2Client = this.getOAuthClient();
    return oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: this.scopes,
      prompt: "consent",
      state: userId,
    });
  }

  async getTokensFromCode(code) {
    const oauth2Client = this.getOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);
    return tokens;
  }

  async storeTokens(userId, tokens) {
    const query = `
      UPDATE users
      SET google_contacts_access_token = $1,
          google_contacts_refresh_token = COALESCE($2, google_contacts_refresh_token),
          google_contacts_token_expiry = $3,
          google_contacts_sync_enabled = true
      WHERE u_id = $4
    `;

    const expiry = tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null;

    await database.query(query, [
      tokens.access_token,
      tokens.refresh_token || null,
      expiry,
      userId,
    ]);
  }

  async updateTokens(userId, tokens) {
    const query = `
      UPDATE users
      SET google_contacts_access_token = $1,
          google_contacts_refresh_token = COALESCE($2, google_contacts_refresh_token),
          google_contacts_token_expiry = $3,
          google_contacts_sync_enabled = true
      WHERE u_id = $4
    `;

    const expiry = tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null;

    await database.query(query, [
      tokens.access_token,
      tokens.refresh_token || null,
      expiry,
      userId,
    ]);
  }

  async getOAuth2Client(userId) {
    const query = `
      SELECT 
        google_contacts_access_token,
        google_contacts_refresh_token,
        google_contacts_token_expiry
      FROM users
      WHERE u_id = $1
    `;

    const result = await database.query(query, [userId]);

    if (result.rows.length === 0) {
      throw new Error("User not found");
    }

    const user = result.rows[0];

    if (!user.google_contacts_access_token || !user.google_contacts_refresh_token) {
      const error = new Error("Google Contacts is not connected");
      error.code = "GOOGLE_CONTACTS_NOT_CONNECTED";
      throw error;
    }

    const oauth2Client = this.getOAuthClient();
    oauth2Client.setCredentials({
      access_token: user.google_contacts_access_token,
      refresh_token: user.google_contacts_refresh_token,
      expiry_date: user.google_contacts_token_expiry
        ? new Date(user.google_contacts_token_expiry).getTime()
        : null,
    });

    if (
      user.google_contacts_token_expiry &&
      new Date(user.google_contacts_token_expiry) < new Date()
    ) {
      const { credentials } = await oauth2Client.refreshAccessToken();
      await this.updateTokens(userId, credentials);
      oauth2Client.setCredentials(credentials);
    }

    return oauth2Client;
  }

  async getStatus(userId) {
    const query = `
      SELECT 
        google_contacts_access_token,
        google_contacts_refresh_token,
        google_contacts_sync_enabled,
        google_contacts_last_sync_at,
        google_contacts_total_imported,
        google_contacts_last_import_count
      FROM users
      WHERE u_id = $1
    `;

    const result = await database.query(query, [userId]);

    if (result.rows.length === 0) {
      return {
        connected: false,
        lastSyncAt: null,
        totalImported: 0,
        lastImportCount: 0,
        needsReconnect: false,
      };
    }

    const user = result.rows[0];
    const connected =
      !!user.google_contacts_access_token && !!user.google_contacts_refresh_token;

    return {
      connected,
      lastSyncAt: user.google_contacts_last_sync_at,
      totalImported: user.google_contacts_total_imported || 0,
      lastImportCount: user.google_contacts_last_import_count || 0,
      needsReconnect: user.google_contacts_sync_enabled && !connected,
    };
  }

  async disconnect(userId) {
    const query = `
      UPDATE users
      SET google_contacts_access_token = NULL,
          google_contacts_refresh_token = NULL,
          google_contacts_token_expiry = NULL,
          google_contacts_sync_enabled = false
      WHERE u_id = $1
    `;

    await database.query(query, [userId]);
  }

  async importContacts(userId, options = {}) {
    const maxResultsInput = Number(options.maxResults);
    const maxResults = Math.min(
      Math.max(
        Number.isFinite(maxResultsInput) && maxResultsInput > 0
          ? Math.floor(maxResultsInput)
          : this.defaultImportLimit,
        1
      ),
      this.maxImportLimit
    );

    const summary = {
      fetched: 0,
      processed: 0,
      created: 0,
      skippedNoEmail: 0,
      skippedExisting: 0,
      errors: [],
    };

    try {
      const oauth2Client = await this.getOAuth2Client(userId);
      const connections = await this.fetchGoogleContacts(oauth2Client, maxResults);
      summary.fetched = connections.length;

      const existingEmails = await professionalContactService.getExistingContactEmails(userId);

      for (const person of connections) {
        const contactData = this.mapPersonToContactData(person);

        if (!contactData.email) {
          summary.skippedNoEmail++;
          continue;
        }

        summary.processed++;

        const emailKey = contactData.email.toLowerCase();

        if (existingEmails.has(emailKey)) {
          summary.skippedExisting++;
          continue;
        }

        try {
          await professionalContactService.createContact(userId, {
            ...contactData,
            importedFrom: "google_contacts",
          });
          summary.created++;
          existingEmails.add(emailKey);
        } catch (error) {
          console.error("❌ Failed to import Google contact:", error);
          summary.errors.push({
            email: contactData.email,
            message: error.message || "Failed to import contact",
          });
        }
      }

      await this.recordImportStats(userId, summary);
      return summary;
    } catch (error) {
      console.error("❌ Error importing Google Contacts:", error);

      if (error.code === "GOOGLE_CONTACTS_NOT_CONNECTED") {
        throw error;
      }

      if (
        error.code === 401 ||
        error.code === "invalid_grant" ||
        error.message?.includes("invalid_grant")
      ) {
        const authError = new Error("Google Contacts authorization expired. Please reconnect.");
        authError.code = "GOOGLE_CONTACTS_AUTH_EXPIRED";
        throw authError;
      }

      throw error;
    }
  }

  async fetchGoogleContacts(oauth2Client, maxResults) {
    const peopleService = google.people({ version: "v1", auth: oauth2Client });
    const connections = [];
    let nextPageToken = undefined;

    do {
      const remaining = maxResults - connections.length;
      if (remaining <= 0) {
        break;
      }

      const response = await peopleService.people.connections.list({
        resourceName: "people/me",
        personFields: "names,emailAddresses,phoneNumbers,organizations,addresses",
        pageSize: Math.min(500, remaining),
        pageToken: nextPageToken,
        sortOrder: "FIRST_NAME_ASCENDING",
      });

      const fetched = response.data.connections || [];
      connections.push(...fetched);
      nextPageToken = response.data.nextPageToken;
    } while (nextPageToken && connections.length < maxResults);

    return connections.slice(0, maxResults);
  }

  mapPersonToContactData(person) {
    const primaryName =
      (person.names || []).find((name) => name.metadata?.primary) ||
      (person.names || [])[0];
    const primaryEmail =
      (person.emailAddresses || []).find((email) => email.metadata?.primary)?.value ||
      (person.emailAddresses || [])[0]?.value ||
      null;
    const primaryPhone =
      (person.phoneNumbers || []).find((phone) => phone.metadata?.primary)?.value ||
      (person.phoneNumbers || [])[0]?.value ||
      null;
    const primaryOrg =
      (person.organizations || []).find((org) => org.metadata?.primary) ||
      (person.organizations || [])[0];

    const firstName =
      primaryName?.givenName ||
      primaryName?.displayName?.split(" ")?.[0] ||
      undefined;
    const lastName =
      primaryName?.familyName ||
      primaryName?.displayNameLastFirst?.split(",")?.[0] ||
      undefined;

    return {
      firstName,
      lastName,
      email: primaryEmail ? primaryEmail.trim().toLowerCase() : null,
      phone: this.normalizePhone(primaryPhone),
      company: primaryOrg?.name || undefined,
      jobTitle: primaryOrg?.title || undefined,
      location: this.resolveLocation(person),
    };
  }

  normalizePhone(phone) {
    if (!phone) {
      return undefined;
    }
    const digits = phone.replace(/\D/g, "");
    if (digits.length === 11 && digits.startsWith("1")) {
      return digits.slice(1);
    }
    if (digits.length === 10) {
      return digits;
    }
    return undefined;
  }

  resolveLocation(person) {
    const addresses = person.addresses || [];
    const primaryAddress =
      addresses.find((address) => address.metadata?.primary) || addresses[0];

    if (primaryAddress) {
      const parts = [primaryAddress.city, primaryAddress.region]
        .filter(Boolean)
        .map((part) => part.trim());
      if (parts.length) {
        return parts.join(", ");
      }
      if (primaryAddress.formattedValue) {
        return primaryAddress.formattedValue;
      }
    }

    const orgLocation =
      (person.organizations || []).find((org) => org.metadata?.primary)?.location ||
      (person.organizations || [])[0]?.location;

    return orgLocation || undefined;
  }

  async recordImportStats(userId, summary) {
    const query = `
      UPDATE users
      SET google_contacts_last_sync_at = NOW(),
          google_contacts_last_import_count = $1,
          google_contacts_total_imported = COALESCE(google_contacts_total_imported, 0) + $1
      WHERE u_id = $2
    `;

    await database.query(query, [summary.created, userId]);
  }
}

export default new GoogleContactsService();


