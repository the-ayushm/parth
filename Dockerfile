FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* .npmrc* ./
## The iconify-icons directory isn't present in the repository for some builds
## (causes COPY to fail). Commenting out the line below. If you need these
## icons during Docker builds, add `src/assets/iconify-icons` to the repo.
# COPY src/assets/iconify-icons ./src/assets/iconify-icons
RUN \
   npm install --force


# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
ARG NEXT_PUBLIC_MAX_PRODUCT_IMG_SIZE=5
ARG NEXT_PUBLIC_API_URL="https://consoleapinew.surefy.co/v1/"
ARG NEXT_PUBLIC_MAX_PRODUCT_IMG_UPLOAD=5
COPY --from=deps /app/node_modules ./node_modules
## See note above: only copy iconify icons if the directory exists in the image
## (disabled to avoid build failures when the directory is absent).
# COPY --from=deps /app/src/assets/iconify-icons /app/src/assets/iconify-icons
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

RUN \
  npm run build

# Production image, copy all the files and run next
EXPOSE 3000

ENV PORT=3000

ENV HOSTNAME="0.0.0.0"
CMD ["npm", "start"]
