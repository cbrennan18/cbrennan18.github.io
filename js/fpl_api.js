// function getFplMiniLeague() {
//     $(document).ready(function() {
//
//         let objApi = {};
//         getFplBootstrapApi(function(results) {
//             objApi["bootstrapApi"] = results;
//             $(".fpl-gameweek").html("<h5 class='font-weight-normal'>" + objApi.bootstrapApi.gameweek.name + "</h5>");
//         });
//
//         let leagueId = document.getElementById("fplLeagueId").value;
//         if (leagueId === "") {
//             leagueId = "435209";
//         }
//         let cors_api_url = 'https://cors-anywhere.herokuapp.com/';
//         function doCORSRequest(options, printResult) {
//             var x = new XMLHttpRequest();
//             x.open(options.method, cors_api_url + options.url);
//             x.onload = x.onerror = function() {
//                 printResult(
//                     (x.responseText)
//                 );
//             };
//             x.send(options.data);
//         }
//
//         // Bind event
//         // API Fields
//         let urlField = "https://fantasy.premierleague.com/api/leagues-classic/" + leagueId + "/standings/";
//
//         let myObj = null;
//         doCORSRequest({
//             method: 'GET',
//             url: urlField,
//         }, function printResult(result) {
//
//             let obj = JSON.parse(result);
//             // Change JSON object pointer here
//             myObj = obj;
//             // document.getElementById('output').value = JSON.stringify(myObj, undefined, 4);
//             $(".fpl-league-name").html("<h5 class='font-weight-normal'>" + obj.league.name + "</h5>");
//             $('.table-fpl-league').empty();
//             getFplTable(myObj);
//
//         });
//
//         document.querySelector('.viewDataFpl').scrollIntoView({
//             behavior: 'smooth'
//         });
//
//     });
// }
//
//
// function getFplBootstrapApi(callback) {
//     let objApi = {};
//     let cors_api_url = 'https://cors-anywhere.herokuapp.com/';
//     function doCORSRequest(options, printResult) {
//         var x = new XMLHttpRequest();
//         x.open(options.method, cors_api_url + options.url);
//         x.onload = x.onerror = function() {
//             printResult(
//                 (x.responseText)
//             );
//         };
//         x.send(options.data);
//     }
//
//     // Bind event
//     let urlField = "https://fantasy.premierleague.com/api/bootstrap-static/";
//
//     let myObj = null;
//     doCORSRequest({
//         method: 'GET',
//         url: urlField,
//     }, function printResult(result) {
//
//         let obj = JSON.parse(result);
//         // Change JSON object pointer here
//         myObj = obj;
//         objApi["gameweek"] = getFplGameweek(myObj.events);
//         callback(objApi);
//     });
// }
//
// function getFplGameweek(obj) {
//     let today = new Date();
//     for(let i = 0; i < obj.length; i++) {
//         let d = new Date((obj[i].deadline_time_epoch * 1000));
//         if (d > today) {
//             return(obj[i-1]);
//         }
//     }
// }
//
// /* To access FPL team
// get https://fantasy.premierleague.com/api/entry/261192/event/16/picks/ '.picks[i].element'
// add each element to https://fantasy.premierleague.com/api/element-summary/
// add each element to https://fantasy.premierleague.com/api/bootstrap-static/ '.
//
//  */

const proxyURL = 'https://cors-anywhere.herokuapp.com/';
const baseURL = 'https://fantasy.premierleague.com/api/';

const reqType = {
    bootstrap : 'bootstrap-static/', //Overview
    element : 'element-summary/', //Players (playerID)
    events : 'events', // Get all gameweeks
    event : 'event',  //A selected gameweek
    entry : 'entry', //Get a team
    elementTypes: 'element-types', // Get all player positions
    gameweekFixtures: 'fixtures/?event', //Get all fixtures for a specified gameweek (gameweek number)
    teams: 'teams/', //Get all teams,
    leagueClassicStanding: 'leagues-classic/' //Get league standing at current gameweek.
}

const doCORSRequest = async (url) => {
    const response = await fetch(proxyURL + baseURL + url)
    return await response.json()
}

const getBootstrap = async () => {
    return doCORSRequest(reqType.bootstrap);
}

const getGameweeks = () => {
    return doCORSRequest(reqType.events);
}

const getLeague = (id) => {
    return doCORSRequest(`${reqType.leagueClassicStanding}${id}/standings/`);
}

const getPLTeams = () => {
    return doCORSRequest(reqType.teams);
}

const getPlayer = (id) => {
    return doCORSRequest(`${reqType.element}${id}/`);
}

const getTeam = (id) => {
    return doCORSRequest(`${reqType.entry}/${id}/`);

}

const getTeamByGW = (id, gameweek) => {
    return doCORSRequest(`${reqType.entry}/${id}/${reqType.event}/${gameweek}/picks/`);
}

function getFplMiniLeague() {
    $(document).ready(async function() {
        let bootstrap = await getBootstrap();
        let leagueId = document.getElementById("fplLeagueId").value;
        if (leagueId === "") {
            leagueId = "435209";
        }
        let league = await getLeague(leagueId);

        await getFplGameweek(bootstrap.events);
        await showLeague(league);
    });
}

function getFplGameweek(obj) {
    console.log(obj);
    let today = new Date();
    for(let i = 0; i < obj.length; i++) {
        let d = new Date((obj[i].deadline_time_epoch * 1000));
        if (d > today) {
            $(".fpl-gameweek").html("<h5 class='font-weight-normal'>" + obj[i-1].name + "</h5>");
            break;
        }
    }
}

function showLeague(obj) {

    $(".fpl-league-name").html("<h5 class='font-weight-normal'>" + obj.league.name + "</h5>");
    $('.table-fpl-league').empty();
    getFplTable(obj);

    document.querySelector('.viewDataFpl').scrollIntoView({
        behavior: 'smooth'
    });
}

function getFplTable(obj) {
    let rank = obj.standings.results;
    for (let i = 0; i < rank.length; i++) {
        let item = $(
            '<tr>' +
                '<th scope="row">' + rank[i].rank + '</th>' +
                '<td><span class="fpl-red">' + rank[i].entry_name + '</span><br><span class="font-weight-lighter">' + rank[i].player_name + '</span></td>' +
                '<td>' + rank[i].total + '</td>' +
            '</tr>');
        item.appendTo($('.table-fpl-league'));
    }
}

