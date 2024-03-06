import Game from './game.js';

export default class Library {
    constructor(){
        this.games = []
        this.live;
    }

    newLink(linkString){
        let game = new Game(linkString);
        this.games.push(game);
    }

    loadGame(selectedGame){
        this.live = selectedGame;
    }

    deleteGame(selectedGame){
        this.games[selectedGame].splice();
    }

    
}