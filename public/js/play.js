(() => {
    let initialized = false;

    let gameConfig = {
        finished_at: null,
        started_at: null,
        score_saved: false,
        time_reached: false,
        game_duration: null,
        cards: []
    };

    let progressBarInterval = null;

    //A partir du moment qu'on est connecté à la socket, on peut commencer à échanger avec le serveur node
    jQuery(document).on('socketReady', () => {
        //En cas de changement de la configuration de la partie, on la synchronise
        socket.on('setGameConfiguration', (config) => {
            setCurrentConfiguration(config);
        });

        //En cas de fin de temps impartit ou fin de partie normale ( toute les cartes retournées )
        socket.on('gameFinished', (config) => {
            console.log('%c Jeu terminé ! ', 'background: #222; color: #bada55');
            setCurrentConfiguration(config);
        });

        //Sur la réception de l'event permettant d'afficher une carte
        socket.on('revealCards', (revealedCards) => {
            revealedCards.map(({card_index, card}) => {
                //On supprime la classe backed et on ajoute à la place la classe du fruit correspondant venant du serveur node
                const card_element = jQuery(`.cards-container .fruit-card[data-index=${card_index}]`);
                card_element.find('.fruit-card-image')
                    .removeClass('backed')
                    .addClass(card.fruit);
                card_element.data('fruit', card.fruit);

                // console.log("card_element.data", card_element.data());
            });
        });

        //Sur la réception de l'event permettant de cacher une carte
        socket.on('hideCards', (hiddenCards) => {
            hiddenCards.map(({card_index}) => {
                //On supprime la classe la classe de fruit correspondant précédemment stockée dans les data de l'élément
                const card_element = jQuery(`.cards-container .fruit-card[data-index=${card_index}]`);
                //et on ajoute à la place la classe backed
                console.log("card_element.data('fruit')", card_element.data('fruit'));
                card_element.find('.fruit-card-image')
                    .removeClass(card_element.data('fruit'))
                    .addClass('backed');
                card_element.data('fruit', null);
            });
        });
        setTimeout(() => {
            if (!initialized) {
                socketEmit('getCurrentGameConfiguration', {}, ({config}) => {
                    setCurrentConfiguration(config);
                });
            }
        }, 1000)
    });

    //Génération du code HTML des cards
    const generateBackedCards = (cards_config) => {
        let html = '';
        cards_config.map((fruit_object, card_index) => {
            html += `<div class="fruit-card" data-index="${card_index}">
                    <div class="fruit-card-image fruit ${fruit_object.fruit}"></div>
                 </div>`;
        });
        if (html === "") {
            html = `<h2>Aucune carte à afficher</h2>`
        }
        return html;
    };

    const setCurrentConfiguration = (config) => {
        initialized = true;
        console.log("setCurrentConfiguration");
        gameConfig = config;
        if (config === null) {
            document.location.href = '/';
            throw new Error('Aucun jeu en cours');
        }

        //Génération des cartes en HTML en fonction de la configuration de la session de jeu envoyée depuis le serveur socket
        let cardsHTML = generateBackedCards(config.cards);
        jQuery('.cards-container').html(cardsHTML);
        //Gestion du clic sur une carte
        jQuery('.cards-container .fruit-card').on('click', function () {
            if (gameConfig.finished) return false;
            //Ici on va demander au serveur node quel est la carte qu'on vient de sélectionner
            let card_index = jQuery(this).data('index');
            socketEmit('compareCard', {card_index});
        });
        setTimeout(() => {
            //Petit algorithme pour donner une rotation random pour l'esthetique
            jQuery('.cards-container .fruit-card').each(function () {
                let angle = Math.floor(Math.random() * 10) * (Math.round(Math.random()) ? 1 : -1);
                jQuery(this).css("transform", "rotate(" + angle + "deg)");
            })
        }, 50);
        const $utilsContainer = jQuery('.utils-container');
        //Génération de la progress barre de timer
        if (config.started_at) {
            // const diff = moment(aResult.finished_at).diff(moment(aResult.started_at));
            const theoricEndDate = moment(config.started_at).add(config.game_duration, 'milliseconds');
            const totalTime = moment(theoricEndDate).diff(moment(config.started_at));

            if (!$utilsContainer.find('.progress').length) {
                $utilsContainer.append(
                    `<div class="progress">
                        <div class="progress-bar progress-bar-striped progress-bar-animated" role="progressbar" style="width: 100%" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100"></div>
                    </div>`
                );
            }
            if (progressBarInterval) {
                clearInterval(progressBarInterval);
                progressBarInterval = null;
            }
            //Mise à jour de la progressbar
            progressBarInterval = setInterval(() => {
                let remainingTime = moment(theoricEndDate).diff(moment());
                let percentage = (remainingTime / totalTime) * 100;

                if (percentage <= 0) {
                    percentage = 0;
                    if (progressBarInterval) {
                        clearInterval(progressBarInterval);
                        progressBarInterval = null;
                    }
                }

                $utilsContainer.find('.progress-bar').css('width', percentage + '%').attr('aria-valuenow', percentage);

            }, 500);
        }


        if (config.finished_at !== null) {
            if (progressBarInterval) {
                clearInterval(progressBarInterval);
                progressBarInterval = null;
            }
            const diff = moment(config.finished_at).diff(moment(config.started_at));
            const duration = moment.utc(Math.round(diff/1000) * 1000);

            const totalTime = moment(config.started_at).add(config.game_duration, 'milliseconds').diff(moment(config.started_at));
            const remainingTime = moment(config.finished_at).diff(moment(config.started_at));
            const percentage = 100 - (remainingTime / totalTime) * 100;
            $utilsContainer.find('.progress-bar').css('width', percentage + '%').attr('aria-valuenow', percentage);

            let htmlResult = '';
            if (gameConfig.time_reached) {
                htmlResult = `
                <div id="resultDiv">
                    <h2>
                        Mince ! Tu as perdu, tu n'a pas réussi à trouver toutes les paires dans le temps imparti. <br />
                        C'est vraiment trop bête ! Tu veux une glace ?<br /><br />
                        Ou peut-être retenter ta chance ?
                    </h2>
                    <div class="interactionDiv">
                        <button type="button" class="btn btn-primary mt-5" onclick="document.location.href='/'">Retourner au menu principal</button>
                    </div>
                </div>`;
            } else {
                htmlResult = `
                <div id="resultDiv">
                    <h2>
                        Félicitations tu as fini avec un score de 
                        <span class="highlight">${duration.format('m')} min</span> et 
                        <span class="highlight">${Math.round(parseFloat(parseInt(duration.format('s'))+'.'+parseInt(duration.format('SS'))))} sec</span>
                    </h2>
                    <div class="interactionDiv">
                        <button type="button" class="btn btn-primary mt-5" onclick="saveMyScore()">Enregistrer mon score</button>
                        <div class="spinner-border text-light" role="status" style="display: none">
                          <span class="sr-only">Veuillez patienter...</span>
                        </div>
                    </div>
                </div>`;
            }
            //Affichage du message avec le score
            const $resultDiv = jQuery('#resultDiv');
            if ($resultDiv.length) {
                $resultDiv.replaceWith(htmlResult);
            } else {
                jQuery('.main-container').append(htmlResult);
            }
            if (gameConfig.score_saved) {
                saveScoreSucceded();
            }
        }
    };

    window.saveMyScore = function () {
        const pseudo = prompt("Quel est tom pseudo ?");
        const $interractionDiv = jQuery('#resultDiv').find('.interactionDiv');
        const $button = $interractionDiv.find("button");
        const $spinner = $interractionDiv.find(".spinner-border");

        $button.hide();
        $spinner.fadeIn();
        socketEmit('saveGameScore', {pseudo}, (data) => {
            if (!data.success) {
                $button.show();
                $spinner.hide();
                alert(data.message);
            } else {
                saveScoreSucceded();
            }
        })
    };

    const saveScoreSucceded = () => {
        const $interractionDiv = jQuery('#resultDiv').find('.interactionDiv');
        const $spinner = $interractionDiv.find(".spinner-border");

        $spinner.hide();
        $interractionDiv.html(`
            <h3>Ton score a été enregistré avec succès</h3>
            <button type="button" class="btn btn-primary mt-5" onclick="document.location.href='/'">Retourner au menu principal</button>
        `)
    }
})();

