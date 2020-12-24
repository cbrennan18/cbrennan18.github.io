function getFpl() {

    let leagueId = document.getElementById("fplLeagueId").value;
    if (leagueId === "") {
        leagueId = "435209";
    }
    let cors_api_url = 'https://cors-anywhere.herokuapp.com/';
    function doCORSRequest(options, printResult) {
        var x = new XMLHttpRequest();
        x.open(options.method, cors_api_url + options.url);
        x.onload = x.onerror = function() {
            printResult(
                (x.responseText)
            );
        };
        x.send(options.data);
    }

    // Bind event
    let urlField = "https://fantasy.premierleague.com/api/leagues-classic/" + leagueId + "/standings/";

    let myObj = null;
    doCORSRequest({
        method: 'GET',
        url: urlField,
    }, function printResult(result) {

        let obj = JSON.parse(result);
        // Change JSON object pointer here
        myObj = obj;
        // document.getElementById('output').value = JSON.stringify(myObj, undefined, 4);
        document.querySelector(".fpl-league-name").innerHTML = obj.league.name;
        getFplTable(myObj);

    });

    document.querySelector('.viewDataFpl').scrollIntoView({
        behavior: 'smooth'
    });
}

function getFplTable(obj) {
    let rank = obj.standings.results;
    for (let i = 0; i < rank.length; i++) {
        console.log(rank[i]);
        let item = $(
            '<tr>' +
                '<th scope="row">' + rank[i].rank + '</th>' +
                '<td><span class="fpl-red font-weight-bold">' + rank[i].entry_name + '</span><br>' + rank[i].player_name + '</td>' +
                '<td>' + rank[i].total + '</td>' +
            '</tr>');

        item.appendTo($('.table-fpl-league'));
    }
}

