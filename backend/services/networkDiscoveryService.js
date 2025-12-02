import database from "./database.js";

class NetworkDiscoveryService {
  /**
   * Get people in the same industry as the current user
   * Excludes people already in the user's contacts
   */
  async getPeopleInYourIndustry(userId, filters = {}) {
    const {
      search,
      limit = 50,
      offset = 0,
    } = filters;

    try {
      // Get current user's industry from profile
      const profileQuery = `
        SELECT industry FROM profiles WHERE user_id = $1
      `;
      const profileResult = await database.query(profileQuery, [userId]);
      
      if (profileResult.rows.length === 0 || !profileResult.rows[0].industry) {
        return [];
      }

      const userIndustry = profileResult.rows[0].industry;

      // Get all your contact IDs, emails, and contact_user_ids to exclude them
      const myContactsResult = await database.query(
        `SELECT id, email, contact_user_id FROM professional_contacts WHERE user_id = $1`,
        [userId]
      );
      const myContactIds = myContactsResult.rows.map((row) => row.id);
      const myContactUserIds = myContactsResult.rows
        .map((row) => row.contact_user_id)
        .filter((id) => id);
      const myContactEmails = myContactsResult.rows
        .map((row) => row.email)
        .filter((email) => email);

      // Find users with the same industry
      let query = `
        SELECT DISTINCT
          p.user_id,
          p.first_name,
          p.last_name,
          u.email,
          p.phone,
          NULL as company,
          p.job_title,
          p.industry,
          CONCAT(p.city, ', ', p.state) as location,
          NULL as linkedin_url,
          p.pfp_link as contact_profile_picture
        FROM profiles p
        INNER JOIN users u ON p.user_id = u.u_id
        WHERE p.industry = $1
          AND p.user_id != $2
      `;

      const params = [userIndustry, userId];
      let paramIndex = 3;

      // Exclude people you already have in your contacts (by their user_id)
      if (myContactUserIds.length > 0) {
        query += ` AND p.user_id != ALL($${paramIndex}::uuid[])`;
        params.push(myContactUserIds);
        paramIndex++;
      }

      // Exclude people you already have in your contacts (by email)
      if (myContactEmails.length > 0) {
        query += ` AND (u.email IS NULL OR LOWER(u.email) != ALL($${paramIndex}::text[]))`;
        params.push(myContactEmails.map((e) => e.toLowerCase()));
        paramIndex++;
      }

      // Apply search filter
      if (search) {
        query += ` AND (
          p.first_name ILIKE $${paramIndex} OR
          p.last_name ILIKE $${paramIndex} OR
          u.email ILIKE $${paramIndex} OR
          p.job_title ILIKE $${paramIndex}
        )`;
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
        paramIndex += 4;
      }

      query += ` ORDER BY p.first_name ASC, p.last_name ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await database.query(query, params);

      return result.rows.map((row) => ({
        id: row.user_id,
        contactName: `${row.first_name || ""} ${row.last_name || ""}`.trim() || "Unknown",
        contactTitle: row.job_title,
        company: row.company,
        email: row.email,
        phone: row.phone,
        industry: row.industry,
        location: row.location,
        linkedinUrl: row.linkedin_url,
        profilePicture: row.contact_profile_picture,
        contactUserId: row.user_id,
        discoverySource: "same_industry",
        connectionDegree: "Industry Match",
        mutualConnections: [],
        connectionPath: `Same industry: ${row.industry}`,
        relevanceScore: 80, // High relevance for industry match
        outreachInitiated: false,
        addedToContacts: false,
        createdAt: new Date().toISOString(),
      }));
    } catch (error) {
      console.error("❌ Error getting people in your industry:", error);
      throw error;
    }
  }

  /**
   * Get people who have you in their contacts but you don't have them
   * These are people where contact_user_id = currentUserId (they have you as a contact)
   * but you don't have them in your contacts list
   */
  async getPeopleWhoHaveYou(userId, filters = {}) {
    const {
      search,
      limit = 50,
      offset = 0,
    } = filters;

    try {
      // Get all your contact IDs and emails to exclude them
      const myContactsResult = await database.query(
        `SELECT id, email, contact_user_id FROM professional_contacts WHERE user_id = $1`,
        [userId]
      );
      const myContactIds = myContactsResult.rows.map((row) => row.id);
      const myContactUserIds = myContactsResult.rows
        .map((row) => row.contact_user_id)
        .filter((id) => id);
      const myContactEmails = myContactsResult.rows
        .map((row) => row.email)
        .filter((email) => email);

      // Find contacts where contact_user_id = currentUserId (they have you in their contacts)
      // The user_id of those contact records tells us who has you in their contacts
      // We need to get the profile information for those users
      let query = `
        SELECT DISTINCT
          owner_profile.user_id as contact_owner_id,
          owner_profile.first_name,
          owner_profile.last_name,
          owner_user.email,
          owner_profile.phone,
          NULL as company,
          owner_profile.job_title,
          owner_profile.industry,
          CONCAT(owner_profile.city, ', ', owner_profile.state) as location,
          NULL as linkedin_url,
          owner_profile.pfp_link as contact_profile_picture,
          pc.id as source_contact_id
        FROM professional_contacts pc
        INNER JOIN profiles owner_profile ON pc.user_id = owner_profile.user_id
        INNER JOIN users owner_user ON pc.user_id = owner_user.u_id
        WHERE pc.contact_user_id = $1
      `;

      const params = [userId];
      let paramIndex = 2;

      // Exclude people you already have in your contacts (by their user_id)
      if (myContactUserIds.length > 0) {
        query += ` AND owner_profile.user_id != ALL($${paramIndex}::uuid[])`;
        params.push(myContactUserIds);
        paramIndex++;
      }

      // Exclude people you already have in your contacts (by email)
      if (myContactEmails.length > 0) {
        query += ` AND (owner_user.email IS NULL OR LOWER(owner_user.email) != ALL($${paramIndex}::text[]))`;
        params.push(myContactEmails.map((e) => e.toLowerCase()));
        paramIndex++;
      }

      // Apply search filter
      if (search) {
        query += ` AND (
          owner_profile.first_name ILIKE $${paramIndex} OR
          owner_profile.last_name ILIKE $${paramIndex} OR
          owner_user.email ILIKE $${paramIndex} OR
          owner_profile.job_title ILIKE $${paramIndex}
        )`;
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
        paramIndex += 4;
      }

      query += ` ORDER BY owner_profile.first_name ASC, owner_profile.last_name ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await database.query(query, params);

      return result.rows.map((row) => ({
        id: row.contact_owner_id || row.source_contact_id, // Use user_id as the ID
        contactName: `${row.first_name || ""} ${row.last_name || ""}`.trim() || "Unknown",
        contactTitle: row.job_title,
        company: row.company,
        email: row.email,
        phone: row.phone,
        industry: row.industry,
        location: row.location,
        linkedinUrl: row.linkedin_url,
        profilePicture: row.contact_profile_picture,
        contactUserId: row.contact_owner_id, // This is the user_id of the person who has you
        contactOwnerId: row.contact_owner_id,
        discoverySource: "reverse_connection",
        connectionDegree: "1st",
        mutualConnections: [],
        connectionPath: "This user has added you to their contacts. Would you like to add them back?",
        relevanceScore: 100, // High relevance since they already added you
        outreachInitiated: false,
        addedToContacts: false,
        createdAt: new Date().toISOString(),
      }));
    } catch (error) {
      console.error("❌ Error getting people who have you:", error);
      throw error;
    }
  }
  /**
   * Get alumni connections - people who completed education at the same educational institutions
   * An alumni connection means both users have COMPLETED education at the same school
   */
  async getAlumniConnections(userId, filters = {}) {
    const {
      search,
      limit = 50,
      offset = 0,
    } = filters;

    try {
      // Get current user's completed education institutions only
      // Education is considered completed if is_enrolled = false OR graddate IS NOT NULL
      const userEducationQuery = `
        SELECT DISTINCT LOWER(TRIM(school)) as school
        FROM educations
        WHERE user_id = $1 
          AND school IS NOT NULL 
          AND TRIM(school) != ''
          AND (is_enrolled = false OR graddate IS NOT NULL)
      `;
      const userEducationResult = await database.query(userEducationQuery, [userId]);
      
      if (userEducationResult.rows.length === 0) {
        return [];
      }

      const userSchools = userEducationResult.rows.map((row) => row.school);

      // Get all your contact IDs, emails, and contact_user_ids to exclude them
      const myContactsResult = await database.query(
        `SELECT id, email, contact_user_id FROM professional_contacts WHERE user_id = $1`,
        [userId]
      );
      const myContactUserIds = myContactsResult.rows
        .map((row) => row.contact_user_id)
        .filter((id) => id);
      const myContactEmails = myContactsResult.rows
        .map((row) => row.email)
        .filter((email) => email);

      // Find users who also completed education at the same schools
      // Must also be completed (is_enrolled = false OR graddate IS NOT NULL)
      let query = `
        SELECT DISTINCT
          p.user_id,
          p.first_name,
          p.last_name,
          u.email,
          p.phone,
          NULL as company,
          p.job_title,
          p.industry,
          CONCAT(p.city, ', ', p.state) as location,
          NULL as linkedin_url,
          p.pfp_link as contact_profile_picture,
          e.school,
          e.degree_type,
          e.field
        FROM educations e
        INNER JOIN profiles p ON e.user_id = p.user_id
        INNER JOIN users u ON e.user_id = u.u_id
        WHERE LOWER(TRIM(e.school)) = ANY($1::text[])
          AND e.user_id != $2
          AND (e.is_enrolled = false OR e.graddate IS NOT NULL)
      `;

      const params = [userSchools, userId];
      let paramIndex = 3;

      // Exclude people you already have in your contacts (by their user_id)
      if (myContactUserIds.length > 0) {
        query += ` AND p.user_id != ALL($${paramIndex}::uuid[])`;
        params.push(myContactUserIds);
        paramIndex++;
      }

      // Exclude people you already have in your contacts (by email)
      if (myContactEmails.length > 0) {
        query += ` AND (u.email IS NULL OR LOWER(u.email) != ALL($${paramIndex}::text[]))`;
        params.push(myContactEmails.map((e) => e.toLowerCase()));
        paramIndex++;
      }

      // Apply search filter
      if (search) {
        query += ` AND (
          p.first_name ILIKE $${paramIndex} OR
          p.last_name ILIKE $${paramIndex} OR
          u.email ILIKE $${paramIndex} OR
          p.job_title ILIKE $${paramIndex} OR
          e.school ILIKE $${paramIndex}
        )`;
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
        paramIndex += 5;
      }

      query += ` ORDER BY p.first_name ASC, p.last_name ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await database.query(query, params);

      // Group by user_id to handle multiple schools
      const alumniMap = new Map();
      result.rows.forEach((row) => {
        const userId = row.user_id;
        if (!alumniMap.has(userId)) {
          alumniMap.set(userId, {
            id: row.user_id,
            contactName: `${row.first_name || ""} ${row.last_name || ""}`.trim() || "Unknown",
            contactTitle: row.job_title,
            company: row.company,
            email: row.email,
            phone: row.phone,
            industry: row.industry,
            location: row.location,
            linkedinUrl: row.linkedin_url,
            profilePicture: row.contact_profile_picture,
            contactUserId: row.user_id,
            discoverySource: "alumni",
            connectionDegree: "Alumni",
            mutualConnections: [],
            schools: [],
            connectionPath: "",
            relevanceScore: 85,
            outreachInitiated: false,
            addedToContacts: false,
            createdAt: new Date().toISOString(),
          });
        }
        const alumni = alumniMap.get(userId);
        if (row.school && !alumni.schools.includes(row.school)) {
          alumni.schools.push(row.school);
        }
      });

      // Build connection path for each alumni
      const alumniList = Array.from(alumniMap.values()).map((alumni) => {
        const schoolNames = alumni.schools.join(", ");
        alumni.connectionPath = `Alumni from: ${schoolNames}`;
        return alumni;
      });

      return alumniList;
    } catch (error) {
      console.error("❌ Error getting alumni connections:", error);
      throw error;
    }
  }

  /**
   * Get 2nd and 3rd degree contacts by traversing the contact graph using contact_user_id
   * 2nd degree: contacts of your contacts (contacts that belong to your contacts' user accounts)
   * 3rd degree: contacts of your 2nd degree contacts (contacts that belong to 2nd degree contacts' user accounts)
   */
  async getExploreContacts(userId, filters = {}) {
    const {
      degree = "all",
      search,
      limit = 50,
      offset = 0,
    } = filters;

    try {
      // First, get all your contact IDs and emails to exclude them
      const myContactsResult = await database.query(
        `SELECT id, email FROM professional_contacts WHERE user_id = $1`,
        [userId]
      );
      const myContactIds = myContactsResult.rows.map((row) => row.id);
      const myContactEmails = myContactsResult.rows
        .map((row) => row.email)
        .filter((email) => email);
      const myContactEmailsLower = myContactEmails.map((e) => e.toLowerCase());

      // We'll accumulate all suggestions (graph + alumni + company) here
      let allContacts = [];

      // --------------------------------------------------------------------
      // PART 1: Graph-based 2nd/3rd degree contacts (only if you have contacts)
      // --------------------------------------------------------------------
      let secondDegreeContacts = [];
      let thirdDegreeContacts = [];

      if (myContactIds.length > 0) {
        // Get your contacts that have a contact_user_id (they are users in the system)
        // Also get contacts with emails so we can try to match them to users
        const myContactsWithUserIdResult = await database.query(
          `SELECT id, first_name, last_name, contact_user_id, email FROM professional_contacts WHERE user_id = $1 AND contact_user_id IS NOT NULL`,
          [userId]
        );

        // Get contacts with emails but no contact_user_id (like Google Contacts)
        // Try to find users by email to expand the network
        const myContactsWithEmailResult = await database.query(
          `SELECT id, first_name, last_name, email FROM professional_contacts WHERE user_id = $1 AND contact_user_id IS NULL AND email IS NOT NULL`,
          [userId]
        );

        // Combine contacts with contact_user_id and additional user IDs found via email matching
        const myContactsWithUserId = myContactsWithUserIdResult.rows;

        // For contacts with emails but no contact_user_id, try to find matching users
        const additionalUserIds = new Set();
        if (myContactsWithEmailResult.rows.length > 0) {
          const emails = myContactsWithEmailResult.rows
            .map((row) => row.email)
            .filter((e) => e);
          if (emails.length > 0) {
            // Build query with proper parameter placeholders
            const placeholders = emails
              .map((_, i) => `$${i + 1}`)
              .join(", ");
            const userLookupQuery = `
            SELECT u_id, email FROM users WHERE LOWER(email) IN (${placeholders})
          `;
            const userLookupResult = await database.query(
              userLookupQuery,
              emails.map((e) => e.toLowerCase())
            );
            console.log(
              `🔍 Found ${userLookupResult.rows.length} users matching ${emails.length} contact emails`
            );
            userLookupResult.rows.forEach((row) => {
              additionalUserIds.add(row.u_id);
              console.log(
                `  ✅ Matched email ${row.email} to user ${row.u_id}`
              );
            });
          }
        }

        console.log(
          `📊 Network discovery: ${myContactsWithUserId.length} contacts with user_id, ${additionalUserIds.size} additional users found via email`
        );

        const allContactUserIds = [
          ...myContactsWithUserId.map((c) => c.contact_user_id),
          ...Array.from(additionalUserIds),
        ].filter((id) => id);

        if (allContactUserIds.length > 0) {
          // Get 2nd degree contacts: contacts that belong to your contacts' user accounts
          // Use the combined list of user IDs (from contact_user_id and email matching)
          // Join through users table to find contacts for users identified by contact_user_id OR email
          let secondDegreeQuery = `
        SELECT DISTINCT
          pc2.id as contact_id,
          pc2.first_name,
          pc2.last_name,
          pc2.email,
          pc2.phone,
          pc2.company,
          pc2.job_title,
          pc2.industry,
          pc2.location,
          pc2.linkedin_url,
          pc2.contact_user_id,
          p2.pfp_link as contact_profile_picture,
          '2nd' as connection_degree,
          ARRAY_AGG(DISTINCT CONCAT(pc1.first_name, ' ', pc1.last_name)) FILTER (WHERE pc1.first_name IS NOT NULL OR pc1.last_name IS NOT NULL) as mutual_connection_names,
          ARRAY_AGG(DISTINCT pc1.id) as path_through_contacts
          FROM professional_contacts pc1
          INNER JOIN users u ON (
            (pc1.contact_user_id IS NOT NULL AND pc1.contact_user_id = u.u_id)
            OR
            (pc1.contact_user_id IS NULL AND pc1.email IS NOT NULL AND LOWER(pc1.email) = LOWER(u.email))
          )
          INNER JOIN professional_contacts pc2 ON pc2.user_id = u.u_id
          LEFT JOIN profiles p2 ON pc2.contact_user_id = p2.user_id
          WHERE pc1.user_id = $1
            AND u.u_id = ANY($2::uuid[])
        `;

          const secondDegreeParams = [userId, allContactUserIds];
          let paramIndex = 3;

          if (myContactIds.length > 0) {
            secondDegreeQuery += ` AND pc2.id != ALL($${paramIndex}::uuid[])`;
            secondDegreeParams.push(myContactIds);
            paramIndex++;
          }

          // Exclude the current user themselves
          secondDegreeQuery += ` AND pc2.contact_user_id != $${paramIndex}`;
          secondDegreeParams.push(userId);

          secondDegreeQuery += ` GROUP BY pc2.id, pc2.first_name, pc2.last_name, pc2.email, pc2.phone, pc2.company, pc2.job_title, pc2.industry, pc2.location, pc2.linkedin_url, pc2.contact_user_id, p2.pfp_link`;

          const secondDegreeResult = await database.query(
            secondDegreeQuery,
            secondDegreeParams
          );

          secondDegreeContacts = secondDegreeResult.rows.map((row) => ({
            contactId: row.contact_id,
            firstName: row.first_name,
            lastName: row.last_name,
            email: row.email,
            phone: row.phone,
            company: row.company,
            jobTitle: row.job_title,
            industry: row.industry,
            location: row.location,
            linkedinUrl: row.linkedin_url,
            contactUserId: row.contact_user_id,
            profilePicture: row.contact_profile_picture,
            connectionDegree: "2nd",
            mutualConnectionNames: row.mutual_connection_names || [],
            pathThroughContacts: row.path_through_contacts || [],
            alreadyInContacts:
              !!row.email &&
              myContactEmailsLower.includes(row.email.toLowerCase()),
          }));

          // Get all 2nd degree contact IDs to exclude from 3rd degree
          const secondDegreeContactIds = secondDegreeContacts.map(
            (c) => c.contactId
          );
          const allExcludedIds = [...myContactIds, ...secondDegreeContactIds];

          // Get 3rd degree contacts: contacts that belong to 2nd degree contacts' user accounts
          if (
            (degree === "all" || degree === "3rd") &&
            secondDegreeContacts.length > 0
          ) {
            // Get 2nd degree contacts that have a contact_user_id
            const secondDegreeWithUserId = secondDegreeContacts.filter(
              (c) => c.contactUserId
            );

            if (secondDegreeWithUserId.length > 0) {
              const secondDegreeUserIds = secondDegreeWithUserId.map(
                (c) => c.contactUserId
              );

              let thirdDegreeQuery = `
            SELECT DISTINCT
              pc3.id as contact_id,
              pc3.first_name,
              pc3.last_name,
              pc3.email,
              pc3.phone,
              pc3.company,
              pc3.job_title,
              pc3.industry,
              pc3.location,
              pc3.linkedin_url,
              pc3.contact_user_id,
              p3.pfp_link as contact_profile_picture,
              '3rd' as connection_degree,
              ARRAY_AGG(DISTINCT CONCAT(pc2.first_name, ' ', pc2.last_name)) FILTER (WHERE pc2.first_name IS NOT NULL OR pc2.last_name IS NOT NULL) as mutual_connection_names,
              ARRAY_AGG(DISTINCT pc2.id) as path_through_contacts
            FROM professional_contacts pc2
            INNER JOIN professional_contacts pc3 ON pc3.user_id = pc2.contact_user_id
            LEFT JOIN profiles p3 ON pc3.contact_user_id = p3.user_id
            WHERE pc2.contact_user_id = ANY($1::uuid[])
          `;

              const thirdDegreeParams = [secondDegreeUserIds];
              let thirdParamIndex = 2;

              if (allExcludedIds.length > 0) {
                thirdDegreeQuery += ` AND pc3.id != ALL($${thirdParamIndex}::uuid[])`;
                thirdDegreeParams.push(allExcludedIds);
                thirdParamIndex++;
              }

              // Exclude the current user themselves
              thirdDegreeQuery += ` AND pc3.contact_user_id != $${thirdParamIndex}`;
              thirdDegreeParams.push(userId);

              thirdDegreeQuery += ` GROUP BY pc3.id, pc3.first_name, pc3.last_name, pc3.email, pc3.phone, pc3.company, pc3.job_title, pc3.industry, pc3.location, pc3.linkedin_url, pc3.contact_user_id, p3.pfp_link`;

              const thirdDegreeResult = await database.query(
                thirdDegreeQuery,
                thirdDegreeParams
              );

              thirdDegreeContacts = thirdDegreeResult.rows.map((row) => ({
                contactId: row.contact_id,
                firstName: row.first_name,
                lastName: row.last_name,
                email: row.email,
                phone: row.phone,
                company: row.company,
                jobTitle: row.job_title,
                industry: row.industry,
                location: row.location,
                linkedinUrl: row.linkedin_url,
                contactUserId: row.contact_user_id,
                profilePicture: row.contact_profile_picture,
                connectionDegree: "3rd",
                mutualConnectionNames: row.mutual_connection_names || [],
                pathThroughContacts: row.path_through_contacts || [],
                alreadyInContacts:
                  !!row.email &&
                  myContactEmailsLower.includes(row.email.toLowerCase()),
              }));
            }
          }
        }
      }

      // Combine and filter by degree (graph-based only)
      if (degree === "all") {
        allContacts = [...secondDegreeContacts, ...thirdDegreeContacts];
      } else if (degree === "2nd") {
        allContacts = secondDegreeContacts;
      } else if (degree === "3rd") {
        allContacts = thirdDegreeContacts;
      }

      // --------------------------------------------------------------------
      // PART 2: Enrich with alumni connections and company-interest contacts
      // --------------------------------------------------------------------
      try {
        // Alumni suggestions (people who went to the same schools)
        const alumniSuggestions = await this.getAlumniConnections(userId, {
          search,
          limit: 50,
          offset: 0,
        });

        const alumniContacts = (alumniSuggestions || []).map((alumni) => {
          const name = alumni.contactName || "";
          const parts = name.trim().split(/\s+/);
          const firstName = parts[0] || "";
          const lastName = parts.slice(1).join(" ") || "";

          return {
            contactId: alumni.id,
            firstName,
            lastName,
            email: alumni.email,
            phone: alumni.phone,
            company: alumni.company,
            jobTitle: alumni.contactTitle,
            industry: alumni.industry,
            location: alumni.location,
            linkedinUrl: alumni.linkedinUrl,
            contactUserId: alumni.contactUserId,
            profilePicture: alumni.profilePicture,
            connectionDegree: "Alumni",
            mutualConnectionNames: [],
            pathThroughContacts: [],
          };
        });

        // People who work at companies from your job opportunities
        const companyQuery = `
          SELECT DISTINCT LOWER(TRIM(company)) AS company
          FROM job_opportunities
          WHERE user_id = $1
            AND company IS NOT NULL
            AND TRIM(company) != ''
            AND (archived = false OR archived IS NULL)
        `;
        const companyResult = await database.query(companyQuery, [userId]);
        const companies = companyResult.rows
          .map((row) => row.company)
          .filter((c) => c);

        let companyContacts = [];
        if (companies.length > 0) {
          const companyContactsQuery = `
            SELECT DISTINCT
              p.user_id,
              p.first_name,
              p.last_name,
              u.email,
              p.phone,
              j.company,
              j.title as job_title,
              p.industry,
              CONCAT(p.city, ', ', p.state) as location,
              NULL as linkedin_url,
              p.pfp_link as contact_profile_picture
            FROM jobs j
            INNER JOIN profiles p ON j.user_id = p.user_id
            INNER JOIN users u ON j.user_id = u.u_id
            WHERE j.is_current = true
              AND LOWER(TRIM(j.company)) = ANY($1::text[])
              AND j.user_id != $2
          `;

          const companyContactsResult = await database.query(
            companyContactsQuery,
            [companies, userId]
          );

          companyContacts = companyContactsResult.rows.map((row) => ({
            contactId: row.user_id,
            firstName: row.first_name,
            lastName: row.last_name,
            email: row.email,
            phone: row.phone,
            company: row.company,
            jobTitle: row.job_title,
            industry: row.industry,
            location: row.location,
            linkedinUrl: row.linkedin_url,
            contactUserId: row.user_id,
            profilePicture: row.contact_profile_picture,
            connectionDegree: "Company",
            mutualConnectionNames: [],
            pathThroughContacts: [],
          }));
        }

        allContacts = [
          ...allContacts,
          ...alumniContacts,
          ...companyContacts,
        ];
      } catch (enrichError) {
        console.error(
          "⚠️ Error enriching explore contacts with alumni/company data:",
          enrichError
        );
        // Fail open: keep graph-based results even if enrichment fails
      }

      // --------------------------------------------------------------------
      // PART 3: Deduplicate & finalize
      // --------------------------------------------------------------------

      // Deduplicate contacts by email or contactId, merging mutual connections
      const contactMap = new Map();
      
      for (const contact of allContacts) {
        // Use email as primary key if available, otherwise use contactId
        const key = contact.email?.toLowerCase() || contact.contactId;
        
        if (contactMap.has(key)) {
          // Merge with existing contact
          const existing = contactMap.get(key);
          
          // Merge mutual connection names (remove duplicates)
          const allMutualNames = [
            ...(existing.mutualConnectionNames || []),
            ...(contact.mutualConnectionNames || []),
          ];
          const uniqueMutualNames = Array.from(new Set(allMutualNames));
          
          // Merge path through contacts
          const allPaths = [
            ...(existing.pathThroughContacts || []),
            ...(contact.pathThroughContacts || []),
          ];
          const uniquePaths = Array.from(new Set(allPaths.map((p) => p.toString())));
          
          // Merge connection degree with a simple priority system so we don't
          // overwrite special types like 'Alumni' or 'Company' with '3rd'
          const degreePriority = {
            Alumni: 1,
            Company: 2,
            "2nd": 3,
            "3rd": 4,
          };

          const existingDegree = existing.connectionDegree || "3rd";
          const newDegree = contact.connectionDegree || "3rd";

          const mergedDegree =
            (degreePriority[existingDegree] || 99) <=
            (degreePriority[newDegree] || 99)
              ? existingDegree
              : newDegree;
          
          // Update with merged data, keeping the most complete contact info
          contactMap.set(key, {
            ...existing,
            // Prefer non-null values
            firstName: existing.firstName || contact.firstName,
            lastName: existing.lastName || contact.lastName,
            email: existing.email || contact.email,
            phone: existing.phone || contact.phone,
            company: existing.company || contact.company,
            jobTitle: existing.jobTitle || contact.jobTitle,
            industry: existing.industry || contact.industry,
            location: existing.location || contact.location,
            linkedinUrl: existing.linkedinUrl || contact.linkedinUrl,
            connectionDegree: mergedDegree,
            mutualConnectionNames: uniqueMutualNames,
            pathThroughContacts: uniquePaths,
          });
        } else {
          // First occurrence, add to map
          contactMap.set(key, { ...contact });
        }
      }
      
      // Convert map back to array
      allContacts = Array.from(contactMap.values());

      // Apply search filter if provided
      if (search) {
        const searchLower = search.toLowerCase();
        allContacts = allContacts.filter(
          (contact) =>
            (contact.firstName || "").toLowerCase().includes(searchLower) ||
            (contact.lastName || "").toLowerCase().includes(searchLower) ||
            (contact.email || "").toLowerCase().includes(searchLower) ||
            (contact.company || "").toLowerCase().includes(searchLower) ||
            (contact.jobTitle || "").toLowerCase().includes(searchLower)
        );
      }

      // Sort by degree (2nd first), then by number of mutual connections
      allContacts.sort((a, b) => {
        if (a.connectionDegree !== b.connectionDegree) {
          return a.connectionDegree === "2nd" ? -1 : 1;
        }
        return (b.mutualConnectionNames?.length || 0) - (a.mutualConnectionNames?.length || 0);
      });

      // Apply pagination
      const paginatedContacts = allContacts.slice(offset, offset + limit);

        // Map to the expected format
      return paginatedContacts.map((contact) => ({
        id: contact.contactId,
        contactName: `${contact.firstName || ""} ${contact.lastName || ""}`.trim() || "Unknown",
        contactTitle: contact.jobTitle,
        company: contact.company,
        email: contact.email,
        phone: contact.phone,
        industry: contact.industry,
        location: contact.location,
        linkedinUrl: contact.linkedinUrl,
        profilePicture: contact.profilePicture,
        discoverySource: "network_graph",
        connectionDegree: contact.connectionDegree,
        mutualConnections: contact.mutualConnectionNames,
        connectionPath: this.buildConnectionPath(contact),
        relevanceScore: this.calculateRelevanceScore(contact),
        outreachInitiated: false,
        addedToContacts: false,
        alreadyInContacts: !!contact.alreadyInContacts,
        createdAt: new Date().toISOString(),
      }));
    } catch (error) {
      console.error("❌ Error getting explore contacts:", error);
      throw error;
    }
  }

  /**
   * Build a human-readable connection path
   */
  buildConnectionPath(contact) {
    if (contact.mutualConnectionNames && contact.mutualConnectionNames.length > 0) {
      const names = contact.mutualConnectionNames.slice(0, 2);
      if (contact.mutualConnectionNames.length > 2) {
        return `Connected through ${names.join(", ")} and ${contact.mutualConnectionNames.length - 2} more`;
      }
      return `Connected through ${names.join(" and ")}`;
    }
    if (contact.connectionDegree === "Alumni") {
      return "Found via Alumni connection";
    }
    if (contact.connectionDegree === "Company") {
      return "Found via Company connection";
    }
    return `Found via ${contact.connectionDegree} degree connection`;
  }

  /**
   * Calculate relevance score based on mutual connections and data completeness
   */
  calculateRelevanceScore(contact) {
    let score = 0;

    // More mutual connections = higher score
    score += (contact.mutualConnectionNames?.length || 0) * 10;

    // Data completeness bonus
    if (contact.email) score += 5;
    if (contact.company) score += 5;
    if (contact.jobTitle) score += 5;
    if (contact.industry) score += 5;
    if (contact.location) score += 5;

    // 2nd degree is more relevant than 3rd
    if (contact.connectionDegree === "2nd") {
      score += 20;
    }

    return score;
  }

  mapRowToSuggestion(row) {
    return {
      id: row.id,
      contactName: row.contact_name,
      contactTitle: row.contact_title,
      company: row.company,
      discoverySource: row.discovery_source,
      connectionDegree: row.connection_degree,
      mutualConnections: row.mutual_connections,
      connectionPath: row.connection_path,
      relevanceScore: row.relevance_score,
      outreachInitiated: row.outreach_initiated,
      addedToContacts: row.added_to_contacts,
      createdAt: row.created_at,
    };
  }
}

export default new NetworkDiscoveryService();


