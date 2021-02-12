/* To access FPL team
get https://fantasy.premierleague.com/api/entry/261192/event/16/picks/ '.picks[i].element'
add each element to https://fantasy.premierleague.com/api/element-summary/
add each element to https://fantasy.premierleague.com/api/bootstrap-static/ '.
 */

const proxyURL = 'https://fplcorsproxy.herokuapp.com/';
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
    const response = await fetch(proxyURL + baseURL + url, {
        method: 'GET', // *GET, POST, PUT, DELETE, etc.
        headers: {
            "X-Requested-With": "XMLHttpRequest",
            'Access-Control-Allow-Origin':'*'
        }
    });
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
        let gameweek = await getFplGameweek(bootstrap.events);

        await showLeague(league, gameweek);

    });
}

function getTeamByClick(id, gameweek, name) {
    $(document).ready(async function() {
        $(".fpl-team-name").html("<h5 class='font-weight-normal'>" + name + "</h5>");
        let bootstrap = await getBootstrap();
        let teamByGW = await getTeamByGW(id, gameweek);
        console.log(teamByGW, bootstrap);
        await showTeam(teamByGW, bootstrap);
    });
}


function getFplGameweek(obj) {
    let today = new Date();
    for(let i = 0; i < obj.length; i++) {
        let d = new Date((obj[i].deadline_time_epoch * 1000));
        if (d > today) {
            $(".fpl-gameweek").html("<h5 class='font-weight-normal'>" + obj[i-1].name + "</h5>");
            return obj[i-1].id;
        }
    }
}

function showLeague(obj, gameweek) {
    $(".fpl-league-name").html("<h5 class='font-weight-normal'>" + obj.league.name + "</h5>");
    $('.table-fpl-league').empty();
    getFplTable(obj, gameweek);

    document.querySelector('.viewDataFpl').scrollIntoView({
        behavior: 'smooth'
    });

}

function showTeam(team, bootstrap)  {
    let squad = {}
    for (let i = 0; i < team.picks.length; i++) {
        for (let j = 0; j < bootstrap.elements.length; j++) {
            if (bootstrap.elements[j].id === team.picks[i].element) {
                squad[i] = {
                    "id": bootstrap.elements[j].id,
                    "name": bootstrap.elements[j].web_name,
                    "position": bootstrap.elements[j].element_type,
                    "points": bootstrap.elements[j].event_points,
                    "photo": "https://resources.premierleague.com/premierleague/photos/players/110x140/p" + bootstrap.elements[j].code + ".png",
                }
            }
        }
    }
    $(".fpl-team div").html('');
    for (let i = 0; i < Object.keys(squad).length; i++) {
        let item = $(
            "<div class='card text-center border-0 m-0 p-0'>" +
                "<div class='card-body m-1 p-0'>" +
                    "<img class='img-fpl-player' src='" + squad[i].photo + "' alt='Player Image'/>" +
                    "<p class='card-title fpl-player bg-fpl-green-name'>" + squad[i].name + " </p>" +
                    "<p class='card-text fpl-player bg-fpl-green bg-fpl-player-score'>" + squad[i].points + " </p>" +
                "</div>" +
            "</div>"
        );
        if (i < 11) {
            if (squad[i].position === 1) {
                item.appendTo($(".gk"));
            } else if (squad[i].position === 2) {
                item.appendTo($(".def"));
            } else if (squad[i].position === 3) {
                item.appendTo($(".mid"));
            } else {
                item.appendTo($(".fwd"));
            }
        } else {
            item.appendTo($(".bench"));
        }
    }
    document.querySelector('#fplTeam').scrollIntoView({
        behavior: 'smooth'
    });
}

function getFplTable(obj, gameweek) {
    let rank = obj.standings.results;
    for (let i = 0; i < rank.length; i++) {
        let name = "'" + rank[i].entry_name + "'";
        let item = $(
            '<tr onClick="getTeamByClick(' + rank[i].entry + ',' + gameweek + ',' + name + ')">' +
                '<th class="p-0" scope="row">' + rank[i].rank + '</th>' +
                '<td class="p-0"><span class="fpl-red fpl-click">' + rank[i].entry_name + '</span><br><span class="font-weight-lighter fpl-click">' + rank[i].player_name + '</span></td>' +
                '<td class="p-0">' + rank[i].total + '</td>' +
            '</tr>');
        item.appendTo($('.table-fpl-league'));
    }
}

