import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Messages from "./dbMessages.js"
import Pusher from "pusher";
import cors from "cors";

dotenv.config();

const app=express();
const port=process.env.PORT || 8001;
const url=process.env.db_url;
const appId=process.env.appId;
const key=process.env.key;
const secret=process.env.secret;


const pusher = new Pusher({
  appId: appId,
  key: key,
  secret: secret,
  cluster: "ap2",
  useTLS: true
});

app.use(express.json());
app.use(cors());



mongoose.connect(url)
    .then(() => {
        console.log('DB Connected');
    })
    .catch((err) => {
        console.log(err);
    });


const db=mongoose.connection;
db.once('open',()=>{
	console.log("DB Is Ready");

	const msgCollection=db.collection('messagecontents')
	const changeStream=msgCollection.watch();

	changeStream.on('change',(change)=>{
		console.log(change);

		if(change.operationType==='insert'){
			const messageDetails=change.fullDocument;
			pusher.trigger('messages','inserted',
			   {
			   	name:messageDetails.name,
			   	message:messageDetails.message,
			   	timestamp:messageDetails.timestamp,
			   	recieved:messageDetails.recieved,
			   }
			);
		}else{
			console.log('Error in Triggering Pusher');
		}

	})

})

//Routes
app.get("/",(req,res)=>{
	res.status(200).send("Server is Up");
})

app.get('/messages/sync',(req,res)=>{

	Messages.find((err,data)=>{
		if(err){
			res.status(501).send(err);
		}else{
			res.status(200).send(data);
		}
	})
})

app.post('/messages/new',async (req,res)=>{
	const dbMessage=req.body;

	await Messages.create(dbMessage,(err,data)=>{
		if(err){
			res.status(501).send(err);
		}else{
			res.status(201).send(data);
		}
	})
})








app.listen(port,()=>{
	console.log(`Server is up at ${port}`)
})