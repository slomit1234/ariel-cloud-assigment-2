const http = require('http');
const assert = require('assert');

const apiEndpoint = 'Restau-LB8A1-7ASNBoxQWbGn-1713183538.us-east-1.elb.amazonaws.com';
const serverPort = 80;

const baseRestaurantName = 'RestAurantTest';
const cuisines = [
    "Italian", "Cnhiese", "Jpanese", "Mxeican", "Idnian",
    "Fnrech", "Thia", "Snanish", "Grkeek", "Lbeanese",
    "Trukish", "Mraccocan", "Veitnamese", "Koeran", "Cabirbean",
    "Bazilian", "Etihopian", "Rusisan", "Grman", "Cuan",
    "Aerican", "Brtish", "Potruguese", "Atgentinian", "Pervian",
    "Sweidh", "Indoneisian", "Mlayasian", "Filpiino"
];

const regions = [
    "Arad", "Ariel", "Asddod", "Asekelon",
    "BatYam", "Bersheba", "BetShemesh", "BetShean", "BneiBrak",
    "Dimna", "Elait", "Givatayim", "Hdadera", "Haifa",
    "Hreliya", "HdHaSharon", "Hooln", "Jeruslaem", "Krmiel",
    "KfarSaba", "KiryatAta", "KirytBialik", "KiryatGat", "KiryatMlahi",
    "KiryatMtozkin", "KiryatOno", "KiryatShmona", "KiryatYma", "Lod",
    "MalaeAdumim", "MgidalHaEmek", "ModiinMaccabimReut", "ModiinIllit", "Nhariya",
    "Nazareht", "NazarehtIllit", "Nesher", "NessZioan", "Ntanya",
    "Netivot", "Ofakim", "OrAkiav", "PetahTikva", "Raanan",
    "Rhtaat", "RamtGan", "RamtHaSharon", "Ramla", "Rehovto",
    "RisonLeZion", "RoshHaAyin", "Safde", "Sderto", "TlAviv",
    "Tibrieas", "Tira", "Tzfat", "Yvane", "Ykoneam"
];

const requestCount = 5; // Adjust as needed

// Function to make HTTP requests
const sendHttpRequest = (options, postData = null) => {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                resolve({ statusCode: res.statusCode, data: data });
            });
        });

        req.on('error', (e) => {
            console.error('Request error:', e);  // Log the error
            reject(e);
        });

        if (postData) {
            req.write(postData);
        }

        req.end();
    });
};

const postRestaurant = async (i) => {
    const restaurantName = baseRestaurantName + i;
    const restaurant = {
        name: restaurantName,
        cuisine: cuisines[(i % cuisines.length)],
        region: regions[(i % regions.length)]
    };

    const postOptions = {
        hostname: apiEndpoint,
        port: serverPort,
        path: '/restaurants',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    };

    try {
        const startTime = process.hrtime();
        const postResponse = await sendHttpRequest(postOptions, JSON.stringify(restaurant));
        const endTime = process.hrtime(startTime);
        const elapsedTimeInMs = ((endTime[0] * 1e9 + endTime[1]) / 1e6).toFixed(2);

        assert.strictEqual(postResponse.statusCode, 200, `Expected POST status code to be 200 but received ${postResponse.statusCode}. Response: ${postResponse.data}`);

        console.log(`POST ${postOptions.path} Status Code:`, postResponse.statusCode, `; Time Elapsed: ${elapsedTimeInMs}ms`);
    } catch (error) {
        console.error('POST Test failed:', error);
    }
};

const getRestaurant = async (i) => {
    const restaurantName = baseRestaurantName + i;

    const getOptions = {
        hostname: apiEndpoint,
        port: serverPort,
        path: `/restaurants/${restaurantName}`,
        method: 'GET'
    };

    try {
        const startTime = process.hrtime();
        const getResponse = await sendHttpRequest(getOptions);
        const endTime = process.hrtime(startTime);
        const elapsedTimeInMs = ((endTime[0] * 1e9 + endTime[1]) / 1e6).toFixed(2);

        assert.strictEqual(getResponse.statusCode, 200, `Expected GET status code to be 200 but received ${getResponse.statusCode}. Response: ${getResponse.data}`);
        const responseData = JSON.parse(getResponse.data);
        assert.strictEqual(responseData.name, restaurantName, `Expected restaurant name to match but received ${responseData.name}`);
        assert.strictEqual(responseData.cuisine, cuisines[(i % cuisines.length)], `Expected cuisine to match but received ${responseData.cuisine}`);
        assert.strictEqual(responseData.region, regions[(i % regions.length)], `Expected region to match but received ${responseData.region}`);

        console.log(`GET ${getOptions.path} Status Code:`, getResponse.statusCode, `; Time Elapsed: ${elapsedTimeInMs}ms`);
    } catch (error) {
        console.error('GET Test failed:', error);
    }
};

const getRestaurantsByCuisine = async (i) => {
    const getOptions = {
        hostname: apiEndpoint,
        port: serverPort,
        path: `/restaurants/cuisine/${cuisines[(i % cuisines.length)]}`,
        method: 'GET'
    };

    try {
        const startTime = process.hrtime();
        const getResponse = await sendHttpRequest(getOptions);
        const endTime = process.hrtime(startTime);
        const elapsedTimeInMs = ((endTime[0] * 1e9 + endTime[1]) / 1e6).toFixed(2);

        assert.strictEqual(getResponse.statusCode, 200, `Expected GET status code to be 200 but received ${getResponse.statusCode}. Response: ${getResponse.data}`);

        console.log(`GET ${getOptions.path} Status Code:`, getResponse.statusCode, `; Time Elapsed: ${elapsedTimeInMs}ms`);
    } catch (error) {
        console.error('GET Complex Test failed:', error);
    }
};

const deleteRestaurant = async (i) => {
    const restaurantName = baseRestaurantName + i;

    const deleteOptions = {
        hostname: apiEndpoint,
        port: serverPort,
        path: `/restaurants/${restaurantName}`,
        method: 'DELETE'
    };

    try {
        const startTime = process.hrtime();
        const deleteResponse = await sendHttpRequest(deleteOptions);
        const endTime = process.hrtime(startTime);
        const elapsedTimeInMs = ((endTime[0] * 1e9 + endTime[1]) / 1e6).toFixed(2);

        assert.strictEqual(deleteResponse.statusCode, 200, `Expected DELETE status code to be 200 but received ${deleteResponse.statusCode}. Response: ${deleteResponse.data}`);
        const deleteResponseData = JSON.parse(deleteResponse.data);
        assert.deepStrictEqual(deleteResponseData, { success: true }, `Expected success message but received ${deleteResponseData.success}`);

        console.log(`DELETE ${deleteOptions.path} Status Code:`, deleteResponse.statusCode, `; Time Elapsed: ${elapsedTimeInMs}ms`);
    } catch (error) {
        console.error('DELETE Test failed:', error);
    }
};

// Load test
const loadTest = async () => {
    console.log(`Starting load test with ${requestCount} requests`);

    console.log(`Testing POST method...`);
    for (let i = 1; i <= requestCount; i++) {
        await postRestaurant(i);
    }

    console.log(`Testing GET x3 method...`);
    for (let j = 1; j <= 3; j++) {
        for (let i = 1; i <= requestCount; i++) {
            await getRestaurant(i);
        }
    }

    console.log(`Testing GET method with complex query...`);
    for (let i = 1; i <= requestCount; i++) {
        await getRestaurantsByCuisine(i);
    }

    console.log(`Testing DELETE method...`);
    for (let i = 1; i <= requestCount; i++) {
        await deleteRestaurant(i);
    }
};

// Jest test runner wrapper
describe('Load tests for Restaurant API', () => {
    it('should run load tests without errors', async () => {
        await loadTest();
    });
});
