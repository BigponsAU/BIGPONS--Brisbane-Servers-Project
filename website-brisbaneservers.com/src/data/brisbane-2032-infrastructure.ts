/**
 * Copy for the Brisbane 2032 Olympics infrastructure page.
 * Framed as evidence-led context for network capacity and structured delivery — not an official Games partner claim.
 */

import { brisbaneServersProjectObjective } from './brisbane-servers-project-objective';

export const brisbane2032Infrastructure = {
  metaDescription:
    'Brisbane 2032 network implementation objective: hardware, capacity, and structured delivery — with Resources and BIGPONS-captured history for inference from past evidence to future contemplation.',

  hero: {
    eyebrow: 'Civic infrastructure · Brisbane Servers project',
    title: 'Brisbane 2032 and the network the city must build',
    subtitle:
      'The Olympic and Paralympic Games in 2032 are a once-in-a-generation concentration of people, media, transport, venues, and digital services. That moment only works if data networking hardware, backbone capacity, and implementation structure are developed on purpose — through the decade ahead and for the event itself.',
  },

  sections: {
    moment: {
      eyebrow: 'A fixed point in time',
      title: 'One moment in Brisbane’s history',
      byline:
        'Unlike steady-state growth, the Games compress years of demand into weeks: millions of movements, broadcast feeds, ticketing, security systems, venue operations, and public-facing services that must stay available under peak load.',
      points: [
        {
          title: 'Concentrated demand',
          description:
            'Visitor volumes, mobile data, venue Wi‑Fi, logistics, and real-time operations spike together. Networks that suffice on an ordinary Saturday will not suffice on an opening ceremony night without prior capacity planning.',
        },
        {
          title: 'Coordination across jurisdictions',
          description:
            'Venues, transport, hospitals, hotels, councils, and state infrastructure must interoperate. Shared standards for connectivity, monitoring, and incident response reduce the risk of isolated “islands” that fail when load shifts.',
        },
        {
          title: 'Legacy after the flame',
          description:
            'Fibre routes, data centres, edge sites, and digital service patterns built for 2032 can strengthen Brisbane’s economy afterward — if implementation is structured for reuse, not single-use throwaway installs.',
        },
      ],
    },

    necessity: {
      eyebrow: 'What must exist',
      title: 'Data networking hardware and network capacity',
      byline:
        '“More bandwidth” is not a plan. The requirement is layered capacity — physical paths, active equipment, redundancy, operations — sized to documented peak scenarios and tested before the world arrives.',
      layers: [
        {
          title: 'Physical and transport paths',
          description:
            'Fibre backbones, diverse routes, last-mile upgrades to venues and transport hubs, and wireless densification where fixed lines cannot meet mobility needs.',
          icon: 'fas fa-network-wired',
        },
        {
          title: 'Active networking hardware',
          description:
            'Switches, routers, load balancers, firewalls, and edge appliances specified for throughput, latency budgets, and failure domains — with spares and configuration management, not ad hoc rack builds.',
          icon: 'fas fa-server',
        },
        {
          title: 'Compute and platform capacity',
          description:
            'Data centre and cloud capacity for ticketing, media, analytics, identity, and venue systems — with autoscaling limits, regional placement, and DR that match agreed recovery objectives.',
          icon: 'fas fa-database',
        },
        {
          title: 'Observability and security',
          description:
            'Telemetry, capacity dashboards, DDoS and access controls, and runbooks tied to named owners — so operators see saturation before users do, and incidents have a documented chain of command.',
          icon: 'fas fa-shield-alt',
        },
      ],
    },

    structure: {
      eyebrow: 'How it gets built',
      title: 'Implementation structure and development through 2032',
      byline:
        'Large civic programmes fail when technology is procured as a shopping list. They succeed when delivery has governance, phased milestones, test events, and evidence at each gate.',
      phases: [
        {
          title: 'Baseline and gap assessment',
          description:
            'Inventory existing paths, hardware generations, vendor contracts, and peak models. Document gaps against 2032 scenarios before capital commitments.',
        },
        {
          title: 'Architecture and standards',
          description:
            'Reference designs for venue LAN/WAN, broadcast contribution, public safety interfaces, and partner connectivity — so every integrator builds to the same interfaces.',
        },
        {
          title: 'Phased build and test events',
          description:
            'Trial games, cultural festivals, and major sports fixtures as load tests. Measure real throughput, failover times, and operator procedures — adjust before the main event.',
        },
        {
          title: 'Operational readiness',
          description:
            'Staffing, escalation paths, change freezes, and supplier SLAs aligned to the Games calendar — with documentation that survives personnel turnover.',
        },
      ],
    },

    objective: {
      eyebrow: brisbaneServersProjectObjective.businessObjective.title,
      title: 'Implementation is the objective',
      byline: brisbaneServersProjectObjective.businessObjective.implementationGoal,
      outcome: brisbaneServersProjectObjective.primaryOutcome,
      necessity: brisbaneServersProjectObjective.necessityForSite,
    },

    inference: {
      eyebrow: 'Resources and inference',
      title: brisbaneServersProjectObjective.inferenceProgram.title,
      byline: brisbaneServersProjectObjective.inferenceProgram.lead,
      capture: brisbaneServersProjectObjective.inferenceProgram.temporalFrame.capture,
      contemplation: brisbaneServersProjectObjective.inferenceProgram.temporalFrame.contemplation,
    },

    project: {
      eyebrow: 'Brisbane Servers project',
      title: 'Why this site documents the imperative',
      byline:
        'Brisbane Servers is a BIGPONS practice: evidence-led consulting and delivery for Australian businesses. We are not the Olympic organising authority — we document why structured network and platform work matters for this city, and we help teams who must implement under real constraints.',
      commitments: [
        {
          title: 'Truth over hype',
          description:
            'Public guidance here follows the same standard as our resources: context, documented trade-offs, and conclusions you can challenge.',
        },
        {
          title: 'Structured delivery',
          description:
            'Scope, sequencing, and costs visible before major spend — whether you are upgrading a venue network, integrating operations systems, or preparing a supplier footprint for 2032-related work.',
        },
        {
          title: 'Brisbane as operating context',
          description:
            'Recommendations respect Queensland regulation, Australian procurement reality, and the SME scale of many organisations that will touch Games-adjacent demand without Olympic-scale budgets.',
        },
      ],
    },
  },

  timelineNote:
    'Brisbane was awarded the 2032 Olympic and Paralympic Games. Planning horizons span years; network and platform decisions made early reduce rework and risk as venues, transport, and digital programmes converge on 2032.',
} as const;
