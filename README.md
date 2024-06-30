# Piggy Back Tunnel

Piggy Back Tunnel is a reverse TCP tunnel over WebSocket to host local sites in the cloud

## Use Cases
- Make available your local development sites in the cloud.
- Test webhook calls to local sites.

## How it works 
![image](https://user-images.githubusercontent.com/21797317/195246981-b8550e05-bf4c-4d39-a424-42160bd4c2d9.png)

### Demo 

[![Demo](https://img.youtube.com/vi/NZwy95G6xFM/0.jpg)](https://www.youtube.com/watch?v=NZwy95G6xFM)


## Installation
```sh
git clone git@github.com:nishanb/piggy-back.git

npm i

npm i -g
```

## Usage
```sh
# on server side which has public network 
piggyback serve 

# on client side which has private network
piggyback forward -h localhost -p 8090
```

## Contributing
Pull requests are welcome. For significant changes, please open an issue to discuss what you would like to change.
