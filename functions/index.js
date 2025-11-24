const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

admin.initializeApp();

exports.app = onRequest(async (req, res) => {
    try {
        const userAgent = req.headers["user-agent"] || "";

        // Check if it's a social media crawler
        const isCrawler = /facebookexternalhit|WhatsApp|Twitterbot|LinkedInBot|Slackbot|TelegramBot/i.test(userAgent);

        // Serve static files directly (CSS, JS, images, etc.)
        const urlPath = req.path;
        if (urlPath.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|json|txt|woff|woff2|ttf|eot)$/)) {
            const filePath = path.join(__dirname, "hosting", urlPath);
            if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath);
                const ext = path.extname(filePath);
                const contentTypes = {
                    '.js': 'application/javascript',
                    '.css': 'text/css',
                    '.png': 'image/png',
                    '.jpg': 'image/jpeg',
                    '.jpeg': 'image/jpeg',
                    '.gif': 'image/gif',
                    '.ico': 'image/x-icon',
                    '.svg': 'image/svg+xml',
                    '.json': 'application/json',
                    '.txt': 'text/plain',
                    '.woff': 'font/woff',
                    '.woff2': 'font/woff2',
                    '.ttf': 'font/ttf',
                    '.eot': 'application/vnd.ms-fontobject'
                };
                res.setHeader('Content-Type', contentTypes[ext] || 'application/octet-stream');
                return res.status(200).send(content);
            }
        }

        // Read the built index.html from the hosting directory
        const indexPath = path.join(__dirname, "hosting/index.html");

        if (!fs.existsSync(indexPath)) {
            return res.status(500).send("Server configuration error. Please contact support.");
        }

        let html = fs.readFileSync(indexPath, "utf8");

        // Extract event ID from URL
        const reservationMatch = urlPath.match(/\/reservation\/([^\/\?]+)/);
        const joinMatch = urlPath.match(/\/join\/([^\/\?]+)/);

        const eventId = reservationMatch ? reservationMatch[1] : (joinMatch ? joinMatch[1] : null);

        // Only fetch event data for crawlers
        if (isCrawler && eventId) {
            try {
                // Fetch event data from Firestore
                const eventDoc = await admin.firestore().collection("events").doc(eventId).get();

                if (eventDoc.exists) {
                    const event = eventDoc.data();
                    const title = event.title || "Reservaciones";
                    const description = event.description
                        ? `${event.description} Haz una reservación haciendo clic en este link.`
                        : "Create reservations for your favorite events";
                    const imageUrl = event.imageUrl && event.imageUrl !== "placeholder"
                        ? event.imageUrl
                        : "https://reservacion-48a62.web.app/logo512-v2.png";

                    // Escape special characters in strings to prevent regex issues
                    const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

                    // Replace meta tags
                    html = html.replace(
                        /<meta property="og:title" content="[^"]*" \/>/,
                        `<meta property="og:title" content="${escapeRegex(title)}" />`
                    );
                    html = html.replace(
                        /<meta property="og:description" content="[^"]*" \/>/,
                        `<meta property="og:description" content="${escapeRegex(description)}" />`
                    );
                    html = html.replace(
                        /<meta property="og:image" content="[^"]*" \/>/,
                        `<meta property="og:image" content="${escapeRegex(imageUrl)}" />`
                    );
                    html = html.replace(
                        /<meta property="twitter:title" content="[^"]*" \/>/,
                        `<meta property="twitter:title" content="${escapeRegex(title)}" />`
                    );
                    html = html.replace(
                        /<meta property="twitter:description" content="[^"]*" \/>/,
                        `<meta property="twitter:description" content="${escapeRegex(description)}" />`
                    );
                    html = html.replace(
                        /<meta property="twitter:image" content="[^"]*" \/>/,
                        `<meta property="twitter:image" content="${escapeRegex(imageUrl)}" />`
                    );
                    html = html.replace(
                        /<title>[^<]*<\/title>/,
                        `<title>${escapeRegex(title)}</title>`
                    );
                }
            } catch (error) {
                console.error("Error fetching event:", error);
                // Continue with default meta tags if there's an error
            }
        }

        res.setHeader('Content-Type', 'text/html');
        res.status(200).send(html);
    } catch (error) {
        console.error("Fatal error in Cloud Function:", error);
        res.status(500).send("An error occurred. Please try again later.");
    }
});
