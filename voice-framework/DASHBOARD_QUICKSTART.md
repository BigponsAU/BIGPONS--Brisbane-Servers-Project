# Dashboard Quick Start

## Running the Dashboard

1. **Install dependencies** (if not already done):
   ```bash
   npm install
   ```

2. **Start the dashboard server**:
   ```bash
   npm run dashboard
   ```
   
   Or simply:
   ```bash
   npm start
   ```

3. **Open your browser**:
   Navigate to: **http://localhost:3001**

## What You Can Do

### Text Generation
- Enter a topic or seed text
- Select length and style options
- Generate text matching the voice profile

### Text Analysis
- Paste any text to analyze
- View tone characteristics, vocabulary match, and structure analysis
- Get voice match scores and recommendations

### Extrapolation
- Enter text to expand
- Adjust expansion level (1-5)
- Generate extended content maintaining voice consistency

### Voice Matching
- Check how well text matches the voice profile
- View detailed match scores
- See validation results and issues

### A/B Testing
- Run test suites (Default or Quick)
- Compare different text generation variants
- View detailed metrics and comparisons
- See which variants perform best

### Test Results
- View all previous test runs
- Compare results across different test suites
- Track performance over time

## Tips

- Use the sidebar to navigate between sections
- All operations run in real-time
- Results are displayed immediately
- Test results are stored in the session

## Troubleshooting

**Port already in use?**
```bash
PORT=4000 npm run dashboard
```

**Server won't start?**
- Make sure all dependencies are installed: `npm install`
- Check that port 3001 (or your chosen port) is available
- Verify TypeScript is properly configured

**Dashboard not loading?**
- Check the browser console for errors
- Verify the server is running (check terminal output)
- Try refreshing the page

## Next Steps

- Explore the different sections
- Try generating text with various topics
- Run A/B tests to compare variants
- Analyze your own text to see voice match scores


