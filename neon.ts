import { defineConfig } from "@neon/config/v1";

// Branch-scoped S3 storage for the public BRH corpus artifacts. PDFs and
// extracted assets are public documents, so anonymous reads are intentional;
// writes still require the branch credential.
export default defineConfig({
  buckets: {
    "brh-publications": { access: "public_read" },
  },
});
