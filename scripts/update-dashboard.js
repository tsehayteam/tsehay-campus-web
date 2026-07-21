const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'dashboard', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const replacementContent = `                            if (cleanUrl.includes('mediadelivery.net')) {
                                cleanUrl = cleanUrl.split('?')[0].replace('/play/', '/embed/');
                                return (
                                    <iframe
                                        src={\`\${cleanUrl}?primaryColor=%23F9B03C&autoplay=true\`}
                                        loading="lazy"
                                        className="absolute inset-0 w-full h-full border-none"
                                        allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture;"
                                        allowFullScreen
                                    ></iframe>
                                );
                            } else if (cleanUrl.includes('drive.google.com')) {
                                return (
                                    <iframe
                                        src={cleanUrl.replace(/\\/view.*$/, '/preview').replace(/\\/edit.*$/, '/preview')}
                                        loading="lazy"
                                        className="absolute inset-0 w-full h-full border-none"
                                        allow="autoplay; encrypted-media"
                                        allowFullScreen
                                    ></iframe>
                                );
                            } else {
                                return (
                                    <ReactPlayer
                                        key={cleanUrl}
                                        url={cleanUrl}
                                        width="100%"
                                        height="100%"
                                        controls={true}
                                        playing={true}
                                        onEnded={handleVideoEnd}
                                        className="absolute inset-0"
                                    />
                                );
                            }
                        })()`;

// Find the start index
const startStr = "return cleanUrl.includes('mediadelivery.net') ? (";
const endStr = "})()";

const startIndex = content.indexOf(startStr);
if (startIndex !== -1) {
  const endIndex = content.indexOf(endStr, startIndex);
  if (endIndex !== -1) {
    const originalPart = content.substring(startIndex, endIndex + endStr.length);
    content = content.replace(originalPart, replacementContent);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Successfully replaced content via regex in dashboard/page.tsx');
  } else {
    console.log('End string not found');
  }
} else {
  console.log('Start string not found');
}
