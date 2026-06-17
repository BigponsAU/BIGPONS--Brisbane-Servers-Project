import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../utils/auth';
import { industries } from '../../../data/industries';
import {
  loadResources,
  saveResources,
  normalizeTopicSlug,
  topicsMatch,
  type Resource
} from '../../../lib/resources-api';

function generateResourceContent(industry: any, topic: any): string {
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

/**
 * Seed resources from industries/topics data
 * POST /api/resources/seed
 * Requires: Admin authentication
 */
export const POST: APIRoute = async ({ request }) => {
  const startTime = Date.now();
  
  // Check authentication
  const authResult = await requireAdmin(request);
  if ('error' in authResult) {
    return new Response(
      JSON.stringify({
        error: authResult.error,
        code: authResult.code,
        success: false
      }),
      {
        status: 'error' in authResult && authResult.code === 'FORBIDDEN' ? 403 : 401,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    console.log('[API] POST /api/resources/seed - Starting resource seeding');
    
    const existingResources = await loadResources();
    
    const newResources: Resource[] = [];
    let skipped = 0;
    
    // Process each industry
    for (const industry of industries) {
      // If industry has no topics, create a general resource
      if (industry.topics.length === 0) {
        // Check if resource already exists (normalized check)
        if (existingResources.some(r => r.industry === industry.slug && topicsMatch(r.topic, 'overview'))) {
          skipped++;
          continue;
        }
        
        const content = generateResourceContent(industry, {
          name: `${industry.name} Overview`,
          description: industry.description
        });
        
        const resource: Resource = {
          id: `${industry.slug}-overview-${Date.now()}`,
          industry: industry.slug,
          topic: 'overview',
          title: `${industry.name} - Technology Solutions Overview`,
          description: industry.description,
          content: content,
          generatedAt: new Date().toISOString(),
          generatedBy: authResult.user.email,
          version: 1,
          status: 'draft',
          metadata: {
            wordCount: content.split(/\s+/).length,
            semanticLevel: 'medium',
            voiceScore: 0.75
          }
        };
        
        newResources.push(resource);
        continue;
      }
      
      // Process each topic in the industry
      for (const topic of industry.topics) {
        // Check if resource already exists (normalized check)
        if (existingResources.some(r => r.industry === industry.slug && topicsMatch(r.topic, topic.slug))) {
          skipped++;
          continue;
        }
        
        const content = generateResourceContent(industry, topic);
        
        // Use normalized slug for consistency
        const topicSlug = normalizeTopicSlug(topic.slug);
        
        const resource: Resource = {
          id: `${industry.slug}-${topicSlug}-${Date.now()}`,
          industry: industry.slug,
          topic: topicSlug,
          title: `${topic.name} for ${industry.name}`,
          description: topic.description,
          content: content,
          generatedAt: new Date().toISOString(),
          generatedBy: authResult.user.email,
          version: 1,
          status: 'draft',
          metadata: {
            wordCount: content.split(/\s+/).length,
            semanticLevel: 'medium',
            voiceScore: 0.75
          }
        };
        
        newResources.push(resource);
      }
    }
    
    if (newResources.length === 0) {
      const duration = Date.now() - startTime;
      console.log(`[API] POST /api/resources/seed - No new resources (${duration}ms)`);
      
      return new Response(
        JSON.stringify({
          message: 'No new resources to create. All resources already exist.',
          created: 0,
          skipped: skipped,
          total: existingResources.length,
          success: true
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Add new resources to existing ones
    const allResources = [...existingResources, ...newResources];
    await saveResources(allResources);
    
    const duration = Date.now() - startTime;
    console.log(`[API] POST /api/resources/seed - Success: Created ${newResources.length} resources (${duration}ms)`);
    
    return new Response(
      JSON.stringify({
        message: `Successfully seeded ${newResources.length} new resources`,
        created: newResources.length,
        skipped: skipped,
        total: allResources.length,
        resources: newResources.map(r => ({ id: r.id, title: r.title, industry: r.industry, topic: r.topic })),
        success: true
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[API] POST /api/resources/seed - Error after ${duration}ms:`, error);
    
    return new Response(
      JSON.stringify({
        error: message,
        code: 'INTERNAL_ERROR',
        success: false
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
