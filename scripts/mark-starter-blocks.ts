/**
 * Mark Starter Blocks Script
 * Converts existing resources to starter blocks (templates)
 * These will be available to all users as templates
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  ownerId?: string;
  version: number;
  status: 'draft' | 'published' | 'archived';
  isStarterBlock?: boolean;
  visibility?: 'public' | 'private' | 'starter';
  metadata?: {
    wordCount?: number;
    semanticLevel?: 'high' | 'medium' | 'normal';
    voiceScore?: number;
  };
}

async function loadResources(): Promise<Resource[]> {
  try {
    const data = await fs.readFile(RESOURCES_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading resources:', error);
    return [];
  }
}

async function saveResources(resources: Resource[]): Promise<void> {
  await fs.writeFile(RESOURCES_FILE, JSON.stringify(resources, null, 2));
}

async function markStarterBlocks(): Promise<void> {
  console.log('🏷️  Marking resources as starter blocks...\n');
  
  const resources = await loadResources();
  console.log(`📊 Found ${resources.length} resources\n`);
  
  let marked = 0;
  let updated = 0;
  
  // Mark all existing resources as starter blocks
  // These will serve as templates for new users
  for (const resource of resources) {
    const wasAlreadyStarter = resource.isStarterBlock === true;
    const needsStatusUpdate = resource.status !== 'published';
    
    // Mark as starter block (or update if already marked)
    resource.isStarterBlock = true;
    resource.visibility = 'starter';
    resource.ownerId = undefined; // Starter blocks have no owner
    resource.status = 'published'; // Starter blocks should be published
    
    if (wasAlreadyStarter && !needsStatusUpdate) {
      // Already properly configured
      continue;
    } else if (wasAlreadyStarter && needsStatusUpdate) {
      updated++;
      console.log(`🔄 Updated starter block status: ${resource.title}`);
    } else {
      marked++;
      console.log(`✅ Marked as starter block: ${resource.title}`);
    }
  }
  
  await saveResources(resources);
  
  console.log(`\n🎉 Successfully processed ${marked + updated} resources!`);
  console.log(`   ✅ New starter blocks: ${marked}`);
  console.log(`   🔄 Updated existing: ${updated}`);
  console.log(`📊 Total starter blocks: ${resources.filter(r => r.isStarterBlock).length}`);
  console.log(`\n💡 These resources are now available as templates for all users.`);
}

markStarterBlocks().catch((error) => {
  console.error('❌ Error marking starter blocks:', error);
  process.exit(1);
});
