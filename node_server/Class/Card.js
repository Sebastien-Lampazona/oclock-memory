const config = require('../config');
//Cette classe représente UNE carte

/**  @typedef {(import(`./Player`))} Player **/
function Card(fruit) {
    if (fruit && config.available_fruits.includes(fruit)) {
        this.fruit = fruit
    }
    //Si on ne définit pas de fruit
    else if (fruit === null){
        //Alors on en prend un au hasard dans le tableau de fruits
        this.fruit = config.available_fruits[Math.floor(Math.random() * config.available_fruits.length)];
    }
    else throw new Error(`Le fruit ${fruit} fruit n'est pas disponible`);

    this.revealed = false;
}

//Récupère le fruit de la carte
Card.prototype.getFruit = function (){
    return this.fruit;
};

//Récupère le fruit de la carte
Card.prototype.setRevealState = function (revealed){
    this.revealed = revealed;
};

//Récupère l'état de visibilité de la carte
Card.prototype.isRevealed = function (){
    return this.revealed
};

//Récupère le fruit de la carte
Card.prototype.toObject = function (){
    return {
        fruit: this.revealed ? this.fruit : 'backed'
    };
};

module.exports = Card;
