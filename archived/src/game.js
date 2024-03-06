export default class Game {
    constructor(link){
        this.link = link
        this.isSetup = false
        this.grid = []
        this.corners = []
    }

    checkSetup(){
        return this.isSetup;
    }

    setupGameCanvas(){

    }
}