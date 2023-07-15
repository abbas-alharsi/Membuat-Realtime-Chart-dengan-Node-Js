const express = require('express')
const webServer = express()
const port = 3000
const {WebSocketServer} = require('ws')
const socketServer = new WebSocketServer({port: 443})
const {MongoClient} = require('mongodb')


const url = 'mongodb://127.0.0.1:27017'
const client = new MongoClient(url)

webServer.get('/form', (req, res) => {
    res.sendFile('form.html', {root: __dirname})
})

webServer.get('/chart', (req, res) => {
    res.sendFile('chart.html', {root: __dirname})
})

webServer.listen(port, () => {
    console.log(`web server listening on port ${port}`)
})

socketServer.on('connection', ws => {
    console.log('new client connected')
    async function getSales() {
        try{
            await client.connect()
            const data = await client.db('realtime').collection('sales').find({}).toArray()
            socketServer.clients.forEach( e => {
                e.send(JSON.stringify(data))
            })
        } finally {
            client.close()
        }
    }
    ws.on('message', message => {
        switch (JSON.parse(message).type) {
            case 'load':
                getSales()
                break;
            case 'add':
                async function addSales() {
                    try{
                        const docs = await JSON.parse(message)
                        await client.connect()
                        await client.db('realtime').collection('sales').insertOne({tanggal: docs.tanggal, sales: docs.sales})
                    } finally {
                        client.close()
                    }
                }
                addSales().then( () => {
                    getSales()
                })
                break;
            case 'edit':
                async function editSales() {
                    try{
                        const docs = await JSON.parse(message)
                        await client.connect()
                        await client.db('realtime').collection('sales').updateOne({tanggal: docs.tanggal}, {$set: {sales: docs.sales}})
                    } finally {
                        client.close()
                    }
                }
                editSales().then( () => {
                    getSales()
                })
                break;
        }
    })

})