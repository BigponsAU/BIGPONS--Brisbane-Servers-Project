/**
 * Seed Resources Script
 * Automatically creates initial resources from industries/topics data
 * This builds a "forest" of resources - one for each industry/topic combination
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { industries } from '../website-brisbaneservers.com/src/data/industries';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to resources.json
const projectRoot = path.resolve(__dirname, '..');
const RESOURCES_FILE = path.join(projectRoot, 'voice-framework', 'storage', 'resources.json');

interface Resource {
  id: string;
  industry: string;
  topic: string;
  title: string;
  description: string;
  content: string;
  generatedAt: string;
  generatedBy?: string;
  version: number;
  status: 'draft' | 'published' | 'archived';
  metadata?: {
    wordCount?: number;
    semanticLevel?: 'high' | 'medium' | 'normal';
    voiceScore?: number;
  };
}

async function ensureResourcesFile(): Promise<void> {
  try {
    await fs.access(RESOURCES_FILE);
    console.log('✅ Resources file exists:', RESOURCES_FILE);
  } catch {
    console.log('📝 Creating resources file at:', RESOURCES_FILE);
    await fs.mkdir(path.dirname(RESOURCES_FILE), { recursive: true });
    await fs.writeFile(RESOURCES_FILE, JSON.stringify([], null, 2));
  }
}

async function loadResources(): Promise<Resource[]> {
  await ensureResourcesFile();
  try {
    const data = await fs.readFile(RESOURCES_FILE, 'utf-8');
    const resources = JSON.parse(data);
    return Array.isArray(resources) ? resources : [];
  } catch (error) {
    console.error('Error loading resources:', error);
    return [];
  }
}

async function saveResources(resources: Resource[]): Promise<void> {
  await fs.writeFile(RESOURCES_FILE, JSON.stringify(resources, null, 2));
}

function generateResourceContent(industry: any, topic: any): string {
  // Generate comprehensive content based on industry and topic
  const industryName = industry.name;
  const topicName = topic.name;
  const topicDescription = topic.description;
  
  return `${topicName} for ${industryName}

${topicDescription}

## Overview

${topicName} is a critical component for ${industryName.toLowerCase()} businesses. This resource provides practical guidance, real-world examples, and actionable strategies tailored specifically to the ${industryName.toLowerCase()} context in Australia.

## Key Benefits

Implementing effective ${topicName.toLowerCase()} solutions can help ${industryName.toLowerCase()} businesses:

- Improve operational efficiency
- Enhance customer experience
- Reduce manual errors and administrative burden
- Gain better insights through data and analytics
- Scale operations more effectively

## Implementation Considerations

When considering ${topicName.toLowerCase()} solutions for your ${industryName.toLowerCase()} business:

1. **Assess Current Processes**: Understand your existing workflows and identify pain points
2. **Define Requirements**: Clearly outline what you need the solution to accomplish
3. **Research Options**: Explore available tools and platforms that fit your industry
4. **Plan Integration**: Consider how new systems will integrate with existing tools
5. **Budget Planning**: Factor in implementation costs, training, and ongoing maintenance
6. **Compliance**: Ensure any solution meets industry-specific compliance requirements

## Real-World Applications

Many ${industryName.toLowerCase()} businesses have successfully implemented ${topicName.toLowerCase()} solutions. These implementations typically focus on:

- Automating repetitive tasks
- Centralizing information and data
- Improving communication and collaboration
- Enhancing reporting and analytics capabilities
- Streamlining workflows and processes

## Getting Started

To begin exploring ${topicName.toLowerCase()} solutions for your ${industryName.toLowerCase()} business:

1. Document your current processes and identify specific challenges
2. Research solutions that are proven to work in ${industryName.toLowerCase()} contexts
3. Consider consulting with technology experts who understand your industry
4. Start with a pilot or small-scale implementation
5. Measure results and iterate based on feedback

## Next Steps

This resource provides a foundation for understanding ${topicName.toLowerCase()} in the context of ${industryName.toLowerCase()}. For more specific guidance tailored to your business needs, consider:

- Consulting with Brisbane Servers for personalized recommendations
- Exploring case studies from similar businesses
- Attending industry-specific technology workshops
- Reviewing grant opportunities that may support technology adoption

Remember: Technology solutions should solve real business problems. Focus on outcomes that matter to your business, not just the technology itself.`;
}

async function seedResources(): Promise<void> {
  console.log('🌱 Starting resource seeding...\n');
  
  await ensureResourcesFile();
  const existingResources = await loadResources();
  
  console.log(`📊 Found ${existingResources.length} existing resources\n`);
  
  const newResources: Resource[] = [];
  let skipped = 0;
  
  // Process each industry
  for (const industry of industries) {
    console.log(`\n📁 Processing industry: ${industry.name}`);
    
    // If industry has no topics, create a general resource
    if (industry.topics.length === 0) {
      const resourceId = `${industry.slug}-overview-${Date.now()}`;
      
      // Check if resource already exists
      if (existingResources.some(r => r.industry === industry.slug && r.topic === 'overview')) {
        console.log(`  ⏭️  Skipping ${industry.name} overview (already exists)`);
        skipped++;
        continue;
      }
      
      const content = generateResourceContent(industry, {
        name: `${industry.name} Overview`,
        description: industry.description
      });
      
      const resource: Resource = {
        id: resourceId,
        industry: industry.slug,
        topic: 'overview',
        title: `${industry.name} - Technology Solutions Overview`,
        description: industry.description,
        content: content,
        generatedAt: new Date().toISOString(),
        generatedBy: 'system-seed',
        ownerId: undefined, // Starter blocks have no owner
        version: 1,
        status: 'published', // Starter blocks are published by default
        isStarterBlock: true, // Mark as starter block
        visibility: 'starter',
        metadata: {
          wordCount: content.split(/\s+/).length,
          semanticLevel: 'medium',
          voiceScore: 0.75 // Default score, can be improved later
        }
      };
      
      newResources.push(resource);
      console.log(`  ✅ Created overview resource for ${industry.name}`);
      continue;
    }
    
    // Process each topic in the industry
    for (const topic of industry.topics) {
      const resourceId = `${industry.slug}-${topic.slug}-${Date.now()}`;
      
      // Check if resource already exists
      if (existingResources.some(r => r.industry === industry.slug && r.topic === topic.slug)) {
        console.log(`  ⏭️  Skipping ${topic.name} (already exists)`);
        skipped++;
        continue;
      }
      
      const content = generateResourceContent(industry, topic);
      
      const resource: Resource = {
        id: resourceId,
        industry: industry.slug,
        topic: topic.slug,
        title: `${topic.name} for ${industry.name}`,
        description: topic.description,
        content: content,
        generatedAt: new Date().toISOString(),
        generatedBy: 'system-seed',
        ownerId: undefined, // Starter blocks have no owner
        version: 1,
        status: 'published', // Starter blocks are published by default
        isStarterBlock: true, // Mark as starter block
        visibility: 'starter',
        metadata: {
          wordCount: content.split(/\s+/).length,
          semanticLevel: 'medium',
          voiceScore: 0.75 // Default score, can be improved later
        }
      };
      
      newResources.push(resource);
      console.log(`  ✅ Created resource: ${topic.name}`);
    }
  }
  
  if (newResources.length === 0) {
    console.log('\n✨ No new resources to create. All resources already exist!');
    return;
  }
  
  // Add new resources to existing ones
  const allResources = [...existingResources, ...newResources];
  await saveResources(allResources);
  
  console.log(`\n🎉 Successfully seeded ${newResources.length} new resources!`);
  console.log(`⏭️  Skipped ${skipped} existing resources`);
  console.log(`📊 Total resources: ${allResources.length}`);
  console.log(`\n💡 Tip: Review these resources in the portal and use the "Improve" feature to enhance them with voice framework validation.`);
}

// Run the seeding
seedResources().catch((error) => {
  console.error('❌ Error seeding resources:', error);
  process.exit(1);
});
