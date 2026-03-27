# Website to Profile Converter

A tool that extracts text from websites, analyzes it, builds voice profiles, and identifies UX issues and refinement opportunities.

## Overview

The Website to Profile Converter automates the process of:
1. **Extracting text** from websites (HTML content)
2. **Analyzing** the text for voice characteristics
3. **Building** a voice profile automatically
4. **Identifying** errors, warnings, and UX improvement opportunities
5. **Saving** the profile for use in the voice framework

## Usage

### Command Line

```bash
npm run website-to-profile <url> [profile-name]
```

**Examples:**
```bash
# Basic usage
npm run website-to-profile https://example.com

# With custom profile name
npm run website-to-profile https://example.com "My Website Profile"
```

### Programmatic Usage

```typescript
import { WebsiteToProfileConverter } from './website-to-profile';

const converter = new WebsiteToProfileConverter();
await converter.initialize();

// Convert website to profile
const result = await converter.convertWebsiteToProfile(
  'https://example.com',
  'My Profile Name'
);

// Generate report
const report = converter.generateReport(result);
console.log(report);

// Access the profile
const profile = result.profile;
const profileId = result.profileId; // Saved profile ID
```

## Output

The converter generates a comprehensive analysis including:

### 1. Text Statistics
- Character count
- Word count
- Sentence count
- Paragraph count

### 2. Voice Profile
A complete voice profile with:
- **Tone characteristics**: Formality, technicality, accessibility, precision, comprehensiveness
- **Linguistic patterns**: Sentence structure, vocabulary, numerical precision
- **Structural patterns**: Organization, content flow
- **Domain knowledge**: Mathematical, design, and technical concepts
- **Voice markers**: Opening phrases, connecting phrases, emphasis phrases, closing phrases
- **Semantic density**: Information per sentence, technical terms, specificity, abstraction

### 3. Quality Analysis

#### Errors
Critical issues that need attention:
- Missing data
- Inconsistencies
- Low quality content
- Structure issues

#### Warnings
Potential issues to review:
- Incomplete data
- Ambiguous patterns
- Potential problems

#### Quality Score
A score from 0-100 indicating overall profile quality based on:
- Text volume and completeness
- Vocabulary richness
- Domain knowledge presence
- Voice marker detection
- Structural organization
- Tone consistency

### 4. UX Refinement Suggestions

Categorized suggestions for improving the voice profile:

#### Categories
- **Tone**: Formality, technicality, accessibility balance
- **Structure**: Organization, content flow
- **Vocabulary**: Technical terms, descriptive terms
- **Precision**: Numerical values, specific details
- **Accessibility**: Readability, comprehension
- **Comprehensiveness**: Depth, detail level

Each suggestion includes:
- Priority level (high, medium, low)
- Current state
- Suggested improvement
- Rationale

### 5. Objective Truths (Shredder Analysis)

Extracted objective facts from the content:
- Numerical facts
- Definitions
- Relationships
- Processes
- Properties
- Assertions

## Example Report

```
================================================================================
WEBSITE TO PROFILE ANALYSIS REPORT
================================================================================

URL: https://example.com
Profile Name: Website Profile: example.com
Profile ID: profile_1234567890_abc123

TEXT STATISTICS
--------------------------------------------------------------------------------
Characters: 5,234
Words: 856
Sentences: 42
Paragraphs: 8

PROFILE CHARACTERISTICS
--------------------------------------------------------------------------------
Formality: professional
Technicality: high
Accessibility: moderate
Precision: high
Comprehensiveness: moderate

QUALITY ANALYSIS
--------------------------------------------------------------------------------
Quality Score: 82/100

WARNINGS
--------------------------------------------------------------------------------
1. Limited voice markers detected
   Field: voiceMarkers
   Recommendation: More content may be needed to identify distinctive voice patterns

UX REFINEMENT SUGGESTIONS
--------------------------------------------------------------------------------
1. [MEDIUM] Content may be too technical for general audience
   Category: accessibility
   Current State: Technicality: very_high, Accessibility: moderate
   Suggested Improvement: Add explanations, examples, or simplified versions
   Rationale: Balancing technical depth with accessibility improves understanding

2. [HIGH] Content may lack depth or detail
   Category: comprehensiveness
   Current State: Comprehensiveness: moderate
   Suggested Improvement: Add more detailed explanations and examples
   Rationale: Comprehensive content provides better value
```

## Integration with Voice Framework

The generated profile is automatically saved to the profile manager and can be used with:

- **Tone Analyzer**: Analyze new text against the profile
- **Text Generator**: Generate text in the profile's voice
- **Voice Matcher**: Match text to the profile
- **Extrapolator**: Extend content in the profile's style

## Use Cases

### 1. Testing Website Content
Extract text from your website and analyze it to:
- Identify voice inconsistencies
- Find areas needing refinement
- Understand current voice characteristics
- Compare against target voice profile

### 2. Competitor Analysis
Analyze competitor websites to:
- Understand their voice characteristics
- Identify patterns and strategies
- Compare against your own voice

### 3. Content Audit
Review existing content to:
- Ensure consistency across pages
- Identify content gaps
- Find opportunities for improvement

### 4. Profile Development
Build profiles from:
- Existing website content
- Documentation
- Marketing materials
- Any text source

## Error Handling

The converter handles various scenarios:

- **Network errors**: Clear error messages for failed requests
- **Invalid URLs**: Validation and helpful error messages
- **Empty content**: Warnings for insufficient text
- **Parsing errors**: Graceful fallbacks for HTML parsing issues

## Limitations

1. **JavaScript-rendered content**: Only static HTML is extracted. Dynamic content loaded via JavaScript won't be captured.

2. **Minimum content**: At least 100 words recommended for reliable analysis. Less content may result in incomplete profiles.

3. **Single page**: Analyzes one page at a time. For multi-page analysis, run the converter multiple times and merge results.

4. **Rate limiting**: Be mindful of website rate limits when analyzing multiple pages.

## Advanced Usage

### Custom Analysis

```typescript
// Extract text only
const text = await converter.extractTextFromWebsite('https://example.com');

// Analyze existing text
const result = await converter.analyzeAndBuildProfile(
  text,
  'https://example.com',
  'Custom Profile'
);
```

### Batch Processing

```typescript
const urls = [
  'https://example.com/page1',
  'https://example.com/page2',
  'https://example.com/page3'
];

const results = await Promise.all(
  urls.map(url => converter.convertWebsiteToProfile(url))
);

// Compare profiles
results.forEach((result, i) => {
  console.log(`Page ${i + 1}: Quality Score ${result.analysis.qualityScore}`);
});
```

## Troubleshooting

### "Failed to fetch website"
- Check internet connection
- Verify URL is accessible
- Some websites may block automated requests

### "Insufficient text content"
- Website may have minimal text
- Content may be loaded via JavaScript
- Try a different page with more content

### "Low quality score"
- Review warnings and suggestions
- Provide more content (300+ words recommended)
- Check for structural issues in source content

## See Also

- [ENHANCED_FEATURES.md](./ENHANCED_FEATURES.md) - Framework features
- [ProfileBuilder](./builders/profile-builder.ts) - Profile building logic
- [ProfileManager](./storage/profile-manager.ts) - Profile management
- [Shredder](./analyzers/shredder.ts) - Objective truth extraction

