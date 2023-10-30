FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
RUN apt-get -y update
RUN apt-get -y upgrade
RUN apt-get install -y build-essential
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY ./package.json yarn.lock* ./
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then yarn global add pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Or just
# RUN yarn --frozen-lockfile;


# TODO: Rebuild the source code only when needed
FROM base AS builder
WORKDIR /
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
ENV NEXT_TELEMETRY_DISABLED 1

RUN yarn build:all

# # If using npm comment out above and use below instead
# # RUN npm run build

# # Production image, copy all the files and run next
# FROM base AS runner
# WORKDIR /app

# ENV NODE_ENV production
# # Uncomment the following line in case you want to disable telemetry during runtime.
# ENV NEXT_TELEMETRY_DISABLED 1

# RUN addgroup --system --gid 1001 nodejs
# RUN adduser --system --uid 1001 nextjs

# COPY --from=builder . .

# # # Automatically leverage output traces to reduce image size
# # # https://nextjs.org/docs/advanced-features/output-file-tracing
# # COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# # COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static


# USER nextjs

# EXPOSE 3000
# ENV PORT 3000

# # set hostname to localhost
# ENV HOSTNAME "0.0.0.0"

# # Set version to env variable
# ENV NEXT_PUBLIC_VERSION=${VERSION}

# CMD ["yarn", "start"]
