# src/utils/cmsFilters.ts

The normalized lines logic uses a ternary that treats a paragraph without bullet prefixes as a single bullet: hasBulletPrefix ? ... : [raw]. However, when there are no bullet prefixes, the entire raw text (which could be multiple lines) becomes a single item in the array. Then line 142 renders {raw} directly, which could include newlines. This might not render correctly in the UI. Consider if the non-bullet case should split on newlines or always treat the entire response as one block.

# src/utils/cmpdApi.ts

The normalizeEvent function uses 0 as the default for missing coordinates (latitude, longitude, xCoordinate, yCoordinate). Coordinate 0,0 is a valid location (Gulf of Guinea, off the coast of Africa) and should not be used as a sentinel value. This could cause issues if an event genuinely has a 0 coordinate or if the API returns 0 for missing data. Consider using undefined or null for missing numeric coordinates, or validate that coordinates are non-zero before treating them as valid.

The filterCharlotteBoundsEvents function checks event.latitude != null and event.longitude != null, but normalizeEvent defaults missing coordinates to 0. This means an event with missing coordinates will have lat=0, lng=0, which passes the != null check but represents an invalid location (Gulf of Guinea). The filter should also check that coordinates are non-zero or use a more appropriate sentinel value like undefined.

# src/utils/cmsFilters.ts

The holiday detection relies on lowercase matching for closure patterns but uses case-insensitive regex for holiday names and date patterns. This is inconsistent. The closurePattern regex on lines 24-25 uses the i flag, so the lower.test() call on line 28 is redundant since the regex is already case-insensitive. Consider using the regex directly on text instead of lower, or remove the i flag and test on lower.

The regex /dec\.? 2[2-6]/i will match dates like "Dec 22" through "Dec 26", but it will also match "Dec 20", "Dec 21", "Dec 27", "Dec 28", "Dec 29" if they appear in text like "Dec 202X" or "Dec 2nd week". The pattern 2[2-6] matches any two-digit number starting with 2 and ending with 2-6 (20-29). Consider a more precise pattern like /dec\.?\s+2[2-6](?!\d)/i to avoid false matches.

# src/utils/hereApi.ts

The MAX_SHAPE_POINTS cap of 200 is enforced by early return on line 73, but there's no indication to the user or developer that the polyline was truncated. If a road has more than 200 shape points, the polyline will be incomplete and may look odd on the map. Consider logging a warning when the cap is hit, or add a comment in the alert metadata indicating truncation occurred.

# src/utils/twitterFilters.ts

This file has a duplicate in functions/_lib/twitterFilters.ts. The comment warns to "keep both files in sync when making changes", but this creates a maintenance burden and risk of divergence. Consider creating a shared package or using a build step to copy the file, or investigate if Cloudflare Pages Functions can import from the src directory during build.