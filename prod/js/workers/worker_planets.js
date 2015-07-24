importScripts('oboe.js');

var pages;

var workerLocalPlanets = [],
	workerFilms = [],
	workerRemotePlanets = [];

var localPlanetSwitch = false,
	remoteFilmSwitch = false,
	remotePlanetSwitch = false;

var completed = [];

function getLocalPlanetData() {
	oboe( '/data/planets.json' )
		.node('planets.*', function( planet ){
			workerLocalPlanets.push( planet );
			return oboe.drop;
		})
		.done(function(){
			localPlanetSwitch = true;

			planetRequestComplete();
		})
		.fail(function(){
			console.log('Local JSON error.');
		});
}

function getFilmData() {
	oboe( '//swapi.co/api/films/?page=1' )
		.node('results.*', function( film ){
			workerFilms.push( film );

			workerFilms.sort(function(a, b) {
			    return parseFloat(a.episode_id) - parseFloat(b.episode_id);
			});

			return oboe.drop;
		})
		.done(function(){
			remoteFilmSwitch = true;

			planetRequestComplete();
		})
		.fail(function(){
			console.log('Remote SWAPI JSON error with films.');
		});
}

function getRemotePlanetData() {
	for ( i = 1; i < (pages + 1); i ++ ) {
		oboe( '//swapi.co/api/planets/?page=' + i )
			.node('results.*', function( planet ){
				workerRemotePlanets.push( planet );
				return oboe.drop;
			})
			.done(function(){
				completed.push(0);

				remotePlanetSwitch = true;

				if ( completed.length == pages ) {
					planetRequestComplete();
				}
			})
			.fail(function(){
				console.log('Remote SWAPI JSON error with planets.');
			});
	}
}

function planetRequestComplete() {
	if ( localPlanetSwitch && remoteFilmSwitch && remotePlanetSwitch ) {
		for ( i = 0; i < workerRemotePlanets.length; i ++ ) {
			// console.log(i);

			// GIVE GENERAL DIAMETER & ROTATION IF MISSING
			if ( workerRemotePlanets[i].diameter === 'unknown' || workerRemotePlanets[i].diameter === '0' ) {
				workerRemotePlanets[i].diameter = 10000;
			}
			if ( workerRemotePlanets[i].rotation_period === 'unknown' || workerRemotePlanets[i].rotation_period === '0' ) {
				workerRemotePlanets[i].rotation_period = 24;
			}

			// CHANGE DIAMETER & ORBIT TO NUMBERS FROM STRINGS
			var numberDiameter = parseInt( workerRemotePlanets[i].diameter ),
				numberOrbit = parseInt(workerRemotePlanets[i].rotation_period);

			workerRemotePlanets[i].diameter = numberDiameter;
			workerRemotePlanets[i].rotation_period = numberOrbit;

			// SHRINK LARGE PLANETS
			if ( workerRemotePlanets[i].diameter > 100000 ) {
				workerRemotePlanets[i].diameter = numberDiameter / 5;
			}

			// MATCHING DATA SETS
			for ( x = 0; x < workerLocalPlanets.length; x ++ ) {
				if ( workerLocalPlanets[x].name == workerRemotePlanets[i].name ) {
					// ADD X & Z POSITION TO PLANET DATA
					workerRemotePlanets[i].xpos = workerLocalPlanets[x].xpos;
					workerRemotePlanets[i].zpos = workerLocalPlanets[x].zpos;

					// ADD TEXTURES
					workerRemotePlanets[i].texture = workerLocalPlanets[x].terrain
				}
			}
		}

		postMessage( workerRemotePlanets );
	}
}



self.addEventListener( 'message', function( e ) {
	var data = e.data;

	switch (data.cmd) {
		case 'start':
			pages = data.pages;

			getLocalPlanetData();
			getFilmData();
			getRemotePlanetData();

			break;

		case 'stop':
			break;
	};
}, false);