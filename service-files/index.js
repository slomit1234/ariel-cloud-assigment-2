const express = require('express');
const AWS = require('aws-sdk');
const RestaurantsMemcachedActions = require('./model/restaurantsMemcachedActions');

const app = express();
app.use(express.json());

const MEMCACHED_CONFIGURATION_ENDPOINT = process.env.MEMCACHED_CONFIGURATION_ENDPOINT;
const TABLE_NAME = process.env.TABLE_NAME;
const AWS_REGION = process.env.AWS_REGION;
const USE_CACHE = process.env.USE_CACHE === 'true';

const memcachedActions = new RestaurantsMemcachedActions(MEMCACHED_CONFIGURATION_ENDPOINT);

const dbInstance = new AWS.DynamoDB.DocumentClient({ region: AWS_REGION });

app.get('/', (req, res) => {
    const response = {
        MEMCACHED_CONFIGURATION_ENDPOINT: MEMCACHED_CONFIGURATION_ENDPOINT,
        TABLE_NAME: TABLE_NAME,
        AWS_REGION: AWS_REGION,
        // USE_CACHE: USE_CACHE
    };
    res.send(response);
});

app.post('/restaurants', async (req, res) => {
    const { name, cuisine, region } = req.body;

    const checkParams = {
        TableName: TABLE_NAME,
        Key: {
            SimpleKey: name
        }
    };

    const params = {
        TableName: TABLE_NAME,
        Item: {
            SimpleKey: name,
            Cuisine: cuisine,
            GeoRegion: region,
            Rating: 0,
            RatingCounter: 0
        }
    };

    if (USE_CACHE) {
        try
        {
            const isExist = await memcachedActions.getRestaurants(name);

            if (isExist)
            {
                res.status(409).send({ success: false , message: 'Restaurant already exists' });
                return;
            }

        } catch (error) {
            console.error(error);
            res.status(500).send({ success: false, message: "Failed to add restaurant." });
        }
    }

    try {
        const isExist = await dbInstance.get(checkParams).promise();

        if (isExist.Item)
        {
            res.status(409).send({ success: false , message: 'Restaurant already exists' });
            return;
        }

        await dbInstance.put(params).promise();

        if (USE_CACHE) {
            const saveParams = {
                Cuisine: cuisine,
                GeoRegion: region,
                Rating: 0
            };

            await memcachedActions.addRestaurants(name, saveParams)
        }

        res.status(200).send({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).send({ success: false, message: "Failed to add restaurant." });
    }
});

app.get('/restaurants/:restaurantName', async (req, res) => {
    const restaurantName = req.params.restaurantName;
    const params = {
        TableName: TABLE_NAME,
        Key: {
            SimpleKey: restaurantName
        }
    };

    if (USE_CACHE) {
        try
        {
            const restaurant = await memcachedActions.getRestaurants(restaurantName);
            if (restaurant)
            {
                res.status(200).send({
                    name: restaurantName,
                    cuisine: restaurant.Cuisine,
                    rating: restaurant.Rating,
                    region: restaurant.GeoRegion
                });
                return;
            }
        } catch (error) {
            console.error(error);
            res.status(500).send({ success: false, message: "Error retrieving restaurant." });
        }
    }

    try {
        const data = await dbInstance.get(params).promise();
        if (data.Item) {
            res.status(200).send({
                name: data.Item.SimpleKey,
                cuisine: data.Item.Cuisine,
                rating: data.Item.Rating,
                region: data.Item.GeoRegion
            });

            if (USE_CACHE) {
                const saveParams = {
                    Cuisine: data.Item.Cuisine,
                    GeoRegion: data.Item.GeoRegion,
                    Rating: data.Item.Rating
                };
    
                await memcachedActions.addRestaurants(data.Item.SimpleKey, saveParams)
            }

            return;
        }

        res.status(404).send({ success: false, message: "Restaurant not found." });
    } catch (error) {
        console.error(error);
        res.status(500).send({ success: false, message: "Error retrieving restaurant." });
    }
});

app.delete('/restaurants/:restaurantName', async (req, res) => {
    const restaurantName = req.params.restaurantName;
    const params = {
        TableName: TABLE_NAME,
        Key: {
            SimpleKey: restaurantName
        }
    };

    try {
        const isExist = await dbInstance.get(params).promise();

        if (!isExist.Item)
        {
            res.status(404).send({ success: false, message: "Restaurant does not exist." });
            return
        }

        await dbInstance.delete(params).promise();

        if (USE_CACHE) {
            const isResExist = await memcachedActions.getRestaurants(restaurantName);

            if (isResExist) {
                await memcachedActions.deleteRestaurants(restaurantName);
            }
        }

        res.status(200).send({ success: true });
    } catch (error) {
        res.status(500).send({ success: false, message: "Failed to delete restaurant." });
    }
});

app.post('/restaurants/rating', async (req, res) => {
    const { name, rating } = req.body;
    const params = {
        TableName: TABLE_NAME,
        Key: {
            SimpleKey: name
        }
    };

    try {
        const data = await dbInstance.get(params).promise();

        if (!data.Item) {
            res.status(404).send("Restaurant not found");
            return;
        }

        if (!data.Item.RatingCount)
        {
            data.Item.RatingCount = 0;
        }

        const new_rating = ((data.Item.Rating * data.Item.RatingCount) + rating) / ( data.Item.RatingCount + 1);

        // Update the restaurant's rating
        const updateParams = {
            TableName: TABLE_NAME,
            Key: {
                SimpleKey: name
            },
            UpdateExpression: 'set Rating = :r, RatingCount = :rc',
            ExpressionAttributeValues: {
                ':r': new_rating,
                ':rc': data.Item.RatingCount + 1
            }
        };

        await dbInstance.update(updateParams).promise();

        if (USE_CACHE) {
            const isResExist = await memcachedActions.getRestaurants(name);

            if (isResExist) {
                await memcachedActions.deleteRestaurants(name);
            }
        }

        res.status(200).send({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).send({ success: false, message: "Failed to add rating." });
    }
});

app.get('/restaurants/cuisine/:cuisine', async (req, res) => {
    const cuisine = req.params.cuisine;
    const limit = parseInt(req.query.limit || 10);
    const params = {
        TableName: TABLE_NAME,
        IndexName: 'CuisineIndex',
        KeyConditionExpression: 'Cuisine = :cuisine',
        ExpressionAttributeValues: {
            ':cuisine': cuisine,
        },
        Limit: limit,
        ScanIndexForward: false
    };

    if (USE_CACHE) {
        try {
            const cachedRestaurants = await memcachedActions.getRestaurants(cuisine);
            if (cachedRestaurants) {
                res.status(200).send(cachedRestaurants);
                return;
            }
        } catch (error) {
            console.error(error);
            res.status(500).send({ success: false, message: "Failed to retrieve restaurants by cuisine." });
        }
    }

    try {
        const data = await dbInstance.query(params).promise();

        const restaurants = data.Items.map(item => ({
            cuisine: item.Cuisine,
            name: item.SimpleKey,
            rating: item.Rating,
            region: item.GeoRegion
        }));

        if (USE_CACHE) {
            await memcachedActions.addRestaurants(cuisine, restaurants);
        }

        res.status(200).send(restaurants);
    } catch (error) {
        console.error(error);
        res.status(500).send({ success: false, message: "Failed to retrieve restaurants by cuisine." });
    }
});

app.get('/restaurants/region/:region', async (req, res) => {
    const region = req.params.region;
    const limit = parseInt(req.query.limit || 10);
    const params = {
        TableName: TABLE_NAME,
        IndexName: 'GeoRegionIndex',
        KeyConditionExpression: 'GeoRegion = :geoRegion',
        ExpressionAttributeValues: {
            ':geoRegion': region
        },
        Limit: limit,
        ScanIndexForward: false
    };

    if (USE_CACHE) {
        try {
            const cachedRestaurants = await memcachedActions.getRestaurants(region);
            if (cachedRestaurants) {
                res.status(200).send(cachedRestaurants);
                return;
            }
        } catch (error) {
            console.error(error);
            res.status(500).send({ success: false, message: "Failed to retrieve restaurants by region." });
        }
    }

    try {
        const data = await dbInstance.query(params).promise();

        const restaurants = data.Items.map(item => ({
            cuisine: item.Cuisine,
            name: item.SimpleKey,
            rating: item.Rating,
            region: item.GeoRegion
        }));

        if (USE_CACHE) {
            await memcachedActions.addRestaurants(region, restaurants);
        }

        res.send(restaurants);
    } catch (error) {
        console.error(error);
        res.status(500).send({ success: false, message: "Failed to retrieve restaurants by region." });
    }
});


app.get('/restaurants/region/:region/cuisine/:cuisine', async (req, res) => {
    const region = req.params.region;
    const cuisine = req.params.cuisine;
    const limit = parseInt(req.query.limit || 10);

    const params = {
        TableName: TABLE_NAME,
        IndexName: 'GeoRegionCuisineIndex',
        KeyConditionExpression: 'GeoRegion = :geoRegion and Cuisine = :cuisine',
        ExpressionAttributeValues: {
            ':geoRegion': region,
            ':cuisine': cuisine
        },
        Limit: limit,
        ScanIndexForward: false
    };

    const cache_key = `${region}_${cuisine}`;

    if (USE_CACHE) {
        try {
            const cachedRestaurants = await memcachedActions.getRestaurants(cache_key);
            if (cachedRestaurants) {
                res.status(200).send(cachedRestaurants);
                return;
            }
        } catch (error) {
            console.error(error);
            res.status(500).send({ success: false, message: "Failed to retrieve restaurants by region and cuisine." });
        }
    }

    try {
        const data = await dbInstance.query(params).promise();

        const restaurants = data.Items.map(item => ({
            cuisine: item.Cuisine,
            name: item.SimpleKey,
            rating: item.Rating,
            region: item.GeoRegion
        }));

        if (USE_CACHE) {
            await memcachedActions.addRestaurants(cache_key, restaurants);
        }

        res.send(restaurants);
    } catch (error) {
        console.error(error);
        res.status(500).send({ success: false, message: "Failed to retrieve restaurants by region and cuisine." });
    }
});

app.listen(80, () => {
    console.log('Server is running on http://localhost:80');
});

module.exports = { app };