# Voice framework dashboard + REST API (pairs with static site on GitHub Pages).
# Build: docker build -t voice-dashboard .
# Run:  docker run -p 3001:3001 -e ALLOWED_ORIGINS=https://you.github.io -e JWT_SECRET=... voice-dashboard

FROM node:20-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Native deps some transitive packages expect on slim images
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3001)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["npx", "tsx", "dashboard/server.ts"]
