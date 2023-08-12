const cluster = require('cluster'),
    {MongoClient, GridFSBucket} = require('mongodb'),
    replicaSet = false,
    machines = ["127.0.0.1:27017", "127.0.0.1:27018", "127.0.0.1:27019"],
    db = {};

(async () => {
    const client = await MongoClient.connect(
        replicaSet ? "mongodb://" + machines.join() + "/?replicaSet=rs&w=majority&readPreference=secondary"
            :
            "mongodb://" + machines[0],
        {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000
        }).catch(() => process.exit(0));
    db[0] = await client.db("pgp-smtp");
    db[0 + "bucket"] = new GridFSBucket(db[0]);

    if (cluster.isMaster) {
        await checkIndex(db[0], 'users', 'email');
    }
})();

async function checkIndex(db, collection, prop) {
    const exist = await db.listCollections({name: collection}).toArray();
    if (!exist.length) await db.createCollection(collection);
    if ((await db.collection(collection).indexes()).length < 2) {
        await db.collection(collection).insertOne({[prop]: "test"});
        await db.createIndex(collection, prop, {unique: true});
    }
}

module.exports = db;