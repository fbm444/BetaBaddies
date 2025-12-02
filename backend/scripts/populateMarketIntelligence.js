import database from '../services/database.js';
import marketIntelligenceService from '../services/marketIntelligenceService.js';
import blsService from '../services/externalApis/blsService.js';

/**
 * Population script for market intelligence data
 * Run this to initially populate the cache with common job/industry data
 */

async function populateMarketIntelligence() {
  console.log('🚀 Starting market intelligence population...\n');

  try {
    // Common industries to pre-cache
    const industries = [
      'Software Engineering',
      'Data Science',
      'Product Management',
      'Web Development',
      'Information Security'
    ];

    // Common locations
    const locations = [
      'Remote',
      'San Francisco, CA',
      'New York, NY',
      'Austin, TX',
      'Seattle, WA'
    ];

    // Common job titles
    const jobTitles = [
      'Software Engineer',
      'Software Developer',
      'Data Scientist',
      'Product Manager',
      'Web Developer',
      'Data Analyst'
    ];

    // 1. Pre-cache salary data for common job titles
    console.log('📊 Pre-caching salary data for common job titles...');
    let salaryCount = 0;
    
    for (const jobTitle of jobTitles) {
      try {
        const data = await marketIntelligenceService.getSalaryIntelligence(jobTitle, 'Remote');
        if (data && !data.cached) {
          console.log(`   ✓ Cached: ${jobTitle} (Remote)`);
          salaryCount++;
        }
        // Rate limit protection
        await sleep(1000);
      } catch (error) {
        console.log(`   ✗ Failed: ${jobTitle} - ${error.message}`);
      }
    }
    
    console.log(`   📊 Cached ${salaryCount} salary datasets\n`);

    // 2. Pre-cache industry trends
    console.log('📈 Pre-caching industry trends...');
    let industryCount = 0;
    
    for (const industry of industries) {
      for (const location of locations.slice(0, 2)) { // Limit to avoid too many API calls
        try {
          const data = await marketIntelligenceService.getIndustryTrends(industry, location);
          if (data && !data.cached) {
            console.log(`   ✓ Cached: ${industry} in ${location}`);
            industryCount++;
          }
          await sleep(500);
        } catch (error) {
          console.log(`   ✗ Failed: ${industry} - ${error.message}`);
        }
      }
    }
    
    console.log(`   📈 Cached ${industryCount} industry trend datasets\n`);

    // 3. Pre-cache skill demand
    console.log('🔧 Pre-caching skill demand data...');
    let skillCount = 0;
    
    for (const industry of industries.slice(0, 3)) { // Limit to avoid long processing
      try {
        const data = await marketIntelligenceService.getSkillDemandTrends(industry);
        if (data && !data.cached) {
          console.log(`   ✓ Cached: Skills for ${industry}`);
          skillCount++;
        }
        await sleep(500);
      } catch (error) {
        console.log(`   ✗ Failed: ${industry} - ${error.message}`);
      }
    }
    
    console.log(`   🔧 Cached ${skillCount} skill demand datasets\n`);

    // 4. Generate insights for existing users (limit to first 10 for demo)
    console.log('💡 Generating insights for users...');
    const usersResult = await database.query(`
      SELECT u_id 
      FROM users 
      WHERE u_id IN (SELECT user_id FROM profiles)
      LIMIT 10
    `);
    
    let insightCount = 0;
    
    for (const user of usersResult.rows) {
      try {
        const insights = await marketIntelligenceService.generateUserInsights(user.u_id);
        if (insights && insights.length > 0) {
          console.log(`   ✓ Generated ${insights.length} insights for user ${user.u_id.substring(0, 8)}...`);
          insightCount += insights.length;
        }
        await sleep(2000); // Longer delay for AI calls
      } catch (error) {
        console.log(`   ✗ Failed for user ${user.u_id.substring(0, 8)}... - ${error.message}`);
      }
    }
    
    console.log(`   💡 Generated ${insightCount} total insights\n`);

    // 5. Display summary statistics
    console.log('📊 Summary Statistics:');
    
    const cacheStats = await database.query(`
      SELECT 
        data_type,
        COUNT(*) as count,
        MIN(created_at) as oldest,
        MAX(created_at) as newest
      FROM market_intelligence_cache
      GROUP BY data_type
    `);
    
    console.log('\n   Cache Statistics:');
    cacheStats.rows.forEach(row => {
      console.log(`   - ${row.data_type}: ${row.count} entries`);
    });

    const insightStats = await database.query(`
      SELECT 
        insight_type,
        priority,
        COUNT(*) as count
      FROM market_insights
      WHERE status = 'active'
      GROUP BY insight_type, priority
      ORDER BY insight_type, priority
    `);
    
    console.log('\n   Active Insights:');
    insightStats.rows.forEach(row => {
      console.log(`   - ${row.insight_type} (${row.priority}): ${row.count} insights`);
    });

    console.log('\n✅ Market intelligence population complete!');
    console.log('   You can now use the market intelligence API endpoints.\n');

  } catch (error) {
    console.error('❌ Error populating market intelligence:', error);
    throw error;
  }
}

/**
 * Helper function to sleep/delay
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Main execution
 */
async function main() {
  try {
    // Test database connection
    await database.query('SELECT NOW()');
    console.log('✅ Database connection successful\n');

    // Check BLS API configuration
    if (blsService.isConfigured()) {
      console.log('✅ BLS API key configured\n');
    } else {
      console.log('⚠️  BLS API key not configured (will use public tier with limited requests)\n');
    }

    await populateMarketIntelligence();
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default populateMarketIntelligence;

