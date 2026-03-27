/**
 * Topology Routes
 * Handles 3D topology visualization endpoints
 */

import { Router, Request, Response } from 'express';
import { TextStorage } from '../../storage/text-storage';
import { ProfileManager } from '../../storage/profile-manager';
import { handleRouteError } from '../utils/error-handler';

export function createTopologyRoutes(
  textStorage: TextStorage,
  profileManager: ProfileManager
): Router {
  const router = Router();

  /**
   * Get principles data for 3D visualization
   * GET /api/topology/principles?profileId=
   */
  router.get('/topology/principles', async (req: Request, res: Response) => {
    try {
      const { profileId } = req.query;
      
      let principles = textStorage.getPrinciples();
      let relationships = textStorage.getAllRelationships();

      // Filter by profile if specified
      if (profileId) {
        const profile = profileManager.getProfile(profileId as string);
        if (profile) {
          principles = principles.filter(p => {
            const metadata = p.metadata || {};
            return metadata.profileId === profileId || !metadata.profileId;
          });
        }
      }

      // Build 3D coordinates for principles
      const principles3D = principles.map((principle, index) => {
        const total = principles.length;
        const angle = (index / total) * Math.PI * 2;
        const radius = 5 + (principle.metadata?.confidence || 0.5) * 3;
        
        return {
          id: principle.id,
          principle: principle.principle,
          description: principle.description,
          category: principle.category,
          x: Math.cos(angle) * radius,
          y: (principle.metadata?.confidence || 0.5) * 5 - 2.5,
          z: Math.sin(angle) * radius,
          metadata: principle.metadata
        };
      });

      // Build relationship connections
      const connections = relationships.map(rel => {
        const source = principles3D.find(p => p.id === rel.sourceId);
        const target = principles3D.find(p => p.id === rel.targetId);
        
        if (source && target) {
          return {
            id: rel.id,
            sourceId: rel.sourceId,
            targetId: rel.targetId,
            type: rel.relationshipType,
            strength: rel.strength,
            source: { x: source.x, y: source.y, z: source.z },
            target: { x: target.x, y: target.y, z: target.z }
          };
        }
        return null;
      }).filter(Boolean);

      res.json({
        principles: principles3D,
        connections,
        total: principles3D.length,
        success: true
      });
    } catch (error: unknown) {
      handleRouteError(error, res, 500);
    }
  });

  /**
   * Get all profiles' principles for visualization
   * GET /api/topology/profiles
   */
  router.get('/topology/profiles', async (req: Request, res: Response) => {
    try {
      const profiles = profileManager.getAllProfiles();
      const allPrinciples = textStorage.getPrinciples();
      const relationships = textStorage.getAllRelationships();

      const profileData = profiles.map(profile => {
        // Get principles associated with this profile
        const profilePrinciples = allPrinciples.filter(p => {
          const metadata = p.metadata || {};
          return metadata.profileId === profile.id;
        });

        // Build 3D coordinates
        const principles3D = profilePrinciples.map((principle, index) => {
          const total = profilePrinciples.length || 1;
          const angle = (index / total) * Math.PI * 2;
          const radius = 3 + (principle.metadata?.confidence || 0.5) * 2;
          
          return {
            id: principle.id,
            principle: principle.principle,
            description: principle.description,
            category: principle.category,
            x: Math.cos(angle) * radius,
            y: (principle.metadata?.confidence || 0.5) * 3 - 1.5,
            z: Math.sin(angle) * radius,
            metadata: principle.metadata
          };
        });

        return {
          profileId: profile.id,
          profileName: profile.name || 'Unnamed Profile',
          principles: principles3D,
          count: principles3D.length
        };
      });

      res.json({
        profiles: profileData,
        allPrinciples: allPrinciples.map((p, i) => {
          const total = allPrinciples.length;
          const angle = (i / total) * Math.PI * 2;
          const radius = 8;
          return {
            id: p.id,
            principle: p.principle,
            x: Math.cos(angle) * radius,
            y: 0,
            z: Math.sin(angle) * radius
          };
        }),
        success: true
      });
    } catch (error: unknown) {
      handleRouteError(error, res, 500);
    }
  });

  return router;
}


