/**
 * Minimal OpenTelemetry Verification Script
 * This script sends a single trace to Jaeger at http://localhost:4318/v1/traces
 */

const http = require('http');

const traceData = {
    resourceSpans: [
        {
            resource: {
                attributes: [
                    {
                        key: 'service.name',
                        value: { stringValue: 'verification-service' }
                    }
                ]
            },
            scopeSpans: [
                {
                    spans: [
                        {
                            traceId: '1234567890abcdef1234567890abcdef',
                            spanId: '1234567890abcdef',
                            name: 'verification-span',
                            startTimeUnixNano: (Date.now() * 1000000).toString(),
                            endTimeUnixNano: ((Date.now() + 100) * 1000000).toString(),
                            kind: 1,
                            status: { code: 1 }
                        }
                    ]
                }
            ]
        }
    ]
};

const options = {
    hostname: '127.0.0.1',
    port: 4318,
    path: '/v1/traces',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    }
};

const req = http.request(options, (res) => {
    console.log(`Status Code: ${res.statusCode}`);
    res.on('data', (d) => {
        process.stdout.write(d);
    });
    if (res.statusCode === 200) {
        console.log('\nSuccess! Trace sent to Jaeger.');
        console.log('Now check your Jaeger UI (http://localhost:16686) for "verification-service".');
    }
});

req.on('error', (error) => {
    console.error('Error connecting to Jaeger:', error.message);
    console.log('Make sure Jaeger is running (docker ps) and port 4318 is exposed.');
});

req.write(JSON.stringify(traceData));
req.end();
