# Kick Live Websocket

## Features

- Bypass cloudflare API protection via puppeteer to get chatroomids.
- also runs puppeteer in Docker, see Dockerfile to install.
- Handle connection timeouts and errors.
- Automatic reconnect on error and timeout.


## Install

```bash
npm install --save kick_ws_live
```

## Usage

### Simple usage

```javascript
import { WebSocketConnection, MessageEvents, TChatMessageEvent } from "kick_live_ws";

const kickConnection = new WebSocketConnection({name:'xQc'});
kickConnection.connect();

kickConnection.on(MessageEvents.CHATMESSAGE,(messagedata: TChatMessageEvent) => {
    console.log('message',messagedata)
})
```

## Params and options

To create a new `WebSocketConnection` object the following parameters are required.

`WebSocketConnection({name, chatroom_id, channel_id})`


| Param Name | Required | Description |
| ---------- | -------- | ----------- |
| name   | Yes | The unique username of the broadcaster. You can find this name in the URL.<br>Example: `https://kick.com/xQc` => `xQc` |
| chatroom_id | No(Both Yes) |  The unique chatroom_id stays the same for every stream. Chat is also up and recieving messages when the streamer is offline. Fetch `https://kick.com/api/v2/channels/xQc` or CHANNEL + `xQc`  => data.chatroom.id |
| channel_id  | No(Both Yes)| The unique chatroom_id stays the same for every stream. Chat is also up and recieving messages when the streamer is offline. Fetch `https://kick.com/api/v2/channels/xQc` or CHANNEL + `xQc` => data.chatroom.channel_id |

You can bypass the puppeteer getting Ids by setting chatroom_id and channel_id. Both have to be set, only 1 will not work.


## Events

A `WebSocketConnection` object has the following events which can be handled via `.on(eventName, eventHandler)`.

Message Events:
- [CHAT](#CHAT)
- FOLLOWERUPDATE  //T missing
- [BAN](#BAN)
- UNBAN
- MESSEAGEDELETE
- STREAMSTART
- STOPSTREAM
- SUBSCRIPTIONEVENT
- CHANNELSUBSCRIPTION
- GIFTEDSUBSCRIPTION
- LUCKYUSERSWHOGOTGIFTSUBSCRIPTIONS
- GIFTSLEADERBOARDUPDATED
- CHATROOMUPDATED
- CHANNELUPDATED
- STREAMHOST
- PINNEDMESSAGECREATED
- PINNEDMESSAGEDELETED //T missing
- ERROR
- CONNECTED
- [DISCONNECT](#DISCONNECT)
- EVERYTHING
- UNTRACKED

### Message Events

### `CHAT`
Triggered everytime a new chat message arrives.

```javascript
kickConnection.on(MessageEvents.CHATMESSAGE,(messagedata: TChatMessageEvent) => {
    console.log('message',messagedata.content)
  });
```

<br>

### `BAN`
Triggered everytime a user gets banned.

```javascript

  kickConnection.on(MessageEvents.BAN,(banevent:TBanEvent)=>{

    console.log(`User ${banevent.user} banned by ${banevent.banned_by}`)
  })
```

<br>

### `DISCONNECT`
Triggered everytime the websocket disconnects.

You can use this to reconnect. kickConnection will handle the reconnect and add listeners again.

```javascript
  kickConnection.on('disconnect', () => {
    console.log('restart after disconnect')

    setTimeout(() => {
    kickConnection.connect();
  }, 1000); // 1000 milliseconds = 1 seconds
})
```

<br>


Every Message event has its own type in this shema. T{STREAMSTART}Event
The MessageEvents and all types can be imported
```javascript
import { WebSocketConnection, MessageEvents, TChatMessageEvent, TBanEvent } from "kick_live_ws";

```



TFollowEvent and TPinnedMessageDeletedEvent are missing. Will be updated soon.

## TODO - Coming Later

- Adding Jest tests.
- Ability to send messages
- If new messages come up I will add them. You can use the `UNTRACKED` to look if something is not tracked and message me.

## Contributing
Your improvements are welcome! Feel free to open an <a href="https://github.com/allaboutstrategy/kick_live_ws/issues">issue</a> or <a href="https://github.com/allaboutstrategy/kick_live_ws/pulls">pull request</a>.

Discord: .wulfen