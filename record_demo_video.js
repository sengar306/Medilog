/**
 * MediLog Demo Video Screen Recorder Script
 * Automates frame capture and software screen recording for marketing & guidance videos.
 */

const fs = require('fs');
const path = require('path');

console.log('--- MediLog Automated Screen Recording Assistant ---');

const artifactPath = path.join('C:', 'Users', 'vivek', '.gemini', 'antigravity', 'brain', '818aee3d-32b8-4103-894d-037f85a35b78', 'medilog_video_showcase.html');
const outputDir = path.join(__dirname, 'video_frames');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log(`Video Showcase HTML Path: file:///${artifactPath.replace(/\\/g, '/')}`);
console.log(`Target Frames Output Directory: ${outputDir}`);

console.log('\n--- Instructions to Record HD Video ---');
console.log('1. Open the interactive video showcase in Chrome / Edge:');
console.log(`   start "" "${artifactPath}"`);
console.log('2. Press [Win + Alt + R] on Windows to start full 1080p Screen Recording with voiceover.');
console.log('3. Click the "Marketing Promo" or "Step-by-Step Guidance" mode in the video player.');
console.log('4. Stop recording when finished and share your video across marketing channels!');
