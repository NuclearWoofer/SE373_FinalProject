const { MongoClient } = require('mongodb');
const{ ObjectId } = require('mongodb').ObjectId;
const express = require('express');
const path = require('path');
const bodyParser = require("body-parser");
const app = express();
const port = 3000;

async function main() {
	const uri = "mongodb://127.0.0.1:27017/eventsList";
	const client = new MongoClient(uri, {
		useUnifiedTopology: true,
		useNewUrlParser: true,
	});
	try {
		// Connect to the MongoDB cluster
		await client.connect();
		// Make the appropriate DB calls
		await init(client);

	} catch (e) {
		console.error(e);
	}
}
main().catch(console.err);


async function init(client) {
	app.use(express.static(path.join(__dirname, 'public')));
	app.use(bodyParser.json());
	app.use(bodyParser.urlencoded({ extended: true })); 

	const db = client.db('eventList')
	const events = db.collection('events')
	//'init' used to generate test data, adds test data to db
	app.get('/init', function (req, res) {
		events.insertOne({
			text: "Birthday DnD",
			start_date: new Date(2022, 10, 21),
			end_date: new Date(2018, 10, 21)
		})
		events.insertOne({
			text: "Wedding",
			start_date: new Date(2022, 9, 24),
			end_date: new Date(2022, 9, 24)
		})
		events.insertOne({
			text: "Ghost Huntin",
			start_date: new Date(2022, 10, 31),
			end_date: new Date(2022, 10, 31)
		})
		res.send("Test events were added to the database")
	});
	//second handler 'data' used to load data into the calendar from the db
	app.get('/data', function (req, res) {
		events.find().toArray(function (err, data) {
			//set the id property for all client records to the db records, which are stored in id field
			for (var i = 0; i < data.length; i++){
				data[i].id = data[i]._id;
				delete data[i]["!nativeeditor_status"];
			}
			//output response
			res.send(data);
		});
	});

	// Routes POST requests to the path with the specified callback functions.
	app.post('/data', function (req, res) {
		var data = req.body;
		var mode = data["!nativeeditor_status"];
		var sid = data.id;
		var tid = sid;

		function update_response(err) {
			if (err)
				mode = "error";
			else if (mode == "inserted"){
				tid = data._id;
			}
			res.setHeader("Content-Type", "application/json");
			res.send({ action: mode, sid: sid, tid: String(tid) });
		}
		//running db operations
		if (mode == "updated") {
			events.updateOne({"_id": ObjectId(tid)}, {$set: data}, update_response);
		} else if (mode == "inserted") {
			events.insertOne(data, update_response);
		} else if (mode == "deleted") {
			events.deleteOne({"_id": ObjectId(tid)}, update_response)
		} else
			res.send("Not supported operation");
	});
};

// Binds listens for connections on the specified host and port. This method is identical to Node’s http.Server.listen().
app.listen(port, () => {
	console.log("Server is running on port 3000");
});
 