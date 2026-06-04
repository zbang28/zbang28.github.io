// Seed data ported from the original static frontend (index.html).
// This is the canonical content used to populate a fresh database.

export const events = [
  { sport:'Soccer', country:'AR', match:'Argentina vs. Brazil', venue:'La Boqueria', vtype:'Restaurant', neighborhood:'Williamsburg', borough:'Brooklyn', distance:0.4, time:'Sat · 4:00 PM', perks:['Tango','Empanadas'], live:true, when:'This weekend', lat:40.7115, lng:-73.9569, eventType:'watch-party', price:'No cover' },
  { sport:'Soccer', country:'AR', match:'Argentina vs. Brazil', venue:'McCarren Park Lawn', vtype:'Park', neighborhood:'Greenpoint', borough:'Brooklyn', distance:0.8, time:'Sat · 4:00 PM', perks:['Outdoor','Free','Food Trucks'], live:true, when:'This weekend', lat:40.7205, lng:-73.9520, eventType:'watch-party', price:'Free' },
  { sport:'Soccer', country:'BR', match:'Brazil vs. Argentina', venue:'Miss Favela', vtype:'Restaurant', neighborhood:'Williamsburg', borough:'Brooklyn', distance:0.6, time:'Sat · 4:00 PM', perks:['Caipirinhas','Samba'], live:false, when:'This weekend', lat:40.7126, lng:-73.9637, eventType:'watch-party', price:'No cover' },
  { sport:'NHL', country:'US', match:'Rangers vs. Devils', venue:'Brooklyn Brewery', vtype:'Brewery', neighborhood:'Williamsburg', borough:'Brooklyn', distance:1.1, time:'Tonight · 7:00 PM', perks:['Craft Beer'], live:true, when:'Tonight', lat:40.7218, lng:-73.9573, eventType:'watch-party', price:'No cover' },
  { sport:'MLB', country:'US', match:'Yankees vs. Red Sox', venue:'Domino Park', vtype:'Park', neighborhood:'Williamsburg', borough:'Brooklyn', distance:0.5, time:'Tomorrow · 1:05 PM', perks:['Outdoor','Family Friendly'], live:false, when:'Tomorrow', lat:40.7144, lng:-73.9676, eventType:'watch-party', price:'Free' },
  { sport:'NFL', country:'US', match:'Bills vs. Chiefs', venue:'The Pourhouse', vtype:'Sports Bar', neighborhood:'Williamsburg', borough:'Brooklyn', distance:0.4, time:'Sun · 4:25 PM', perks:['Wings','Buckets'], live:false, when:'This weekend', lat:40.7115, lng:-73.9569, eventType:'watch-party', price:'No cover' },
  { sport:'Soccer', country:'AR', match:'Argentina Victory Parade', venue:'Bedford Ave → McCarren Park', vtype:'Plaza', neighborhood:'Williamsburg', borough:'Brooklyn', distance:0.5, time:'Sat · 6:30 PM', perks:['Free','March','Drums'], live:false, when:'This weekend', lat:40.7170, lng:-73.9560, eventType:'parade', price:'Free' },
  { sport:'Soccer', country:'BR', match:'Brazil Carnival March', venue:'Prospect Park West', vtype:'Park', neighborhood:'Park Slope', borough:'Brooklyn', distance:2.0, time:'Sun · 5:00 PM', perks:['Free','Samba','Floats'], live:false, when:'This weekend', lat:40.6694, lng:-73.9750, eventType:'parade', price:'Free' },
  { sport:'Soccer', country:'US', match:'Pickup Soccer · 5v5', venue:'McCarren Park Pitch', vtype:'Park', neighborhood:'Greenpoint', borough:'Brooklyn', distance:0.8, time:'Sat · 10:00 AM', perks:['All Levels','Free'], live:false, when:'This weekend', lat:40.7205, lng:-73.9520, eventType:'pickup', price:'Free' },
  { sport:'NBA', country:'US', match:'Pickup Basketball · Open Run', venue:'McCarren Park Courts', vtype:'Park', neighborhood:'Greenpoint', borough:'Brooklyn', distance:0.8, time:'Sun · 11:00 AM', perks:['All Levels','Free'], live:false, when:'This weekend', lat:40.7205, lng:-73.9520, eventType:'pickup', price:'Free' },
  { sport:'Soccer', country:'AR', match:'Argentina vs. Brazil', venue:'Boca Juniors NYC', vtype:'Restaurant', neighborhood:'Jackson Heights', borough:'Queens', distance:6.0, time:'Sat · 4:00 PM', perks:['Asado','Mate'], live:true, when:'This weekend', lat:40.7558, lng:-73.8831, eventType:'watch-party', price:'No cover' },
  { sport:'NBA', country:'US', match:'Knicks vs. Celtics', venue:"Foley's Bar & Grill", vtype:'Sports Bar', neighborhood:'Midtown', borough:'Manhattan', distance:5.2, time:'Tonight · 7:30 PM', perks:['Happy Hour'], live:true, when:'Tonight', lat:40.7549, lng:-73.9840, eventType:'watch-party', price:'No cover' },
  { sport:'NHL', country:'US', match:'Rangers vs. Devils', venue:'Westlight Rooftop', vtype:'Rooftop', neighborhood:'Williamsburg', borough:'Manhattan', distance:5.1, time:'Tonight · 7:00 PM', perks:['Skyline View'], live:true, when:'Tonight', lat:40.7220, lng:-73.9580, eventType:'watch-party', price:'$15 min' },
  { sport:'UFC', country:'US', match:'UFC 312 Main Card', venue:'Iron Bar', vtype:'Sports Bar', neighborhood:'Midtown', borough:'Manhattan', distance:5.5, time:'Sat · 10:00 PM', perks:['PPV','Reserved'], live:false, when:'This weekend', lat:40.7549, lng:-73.9840, eventType:'watch-party', price:'$20 cover' },
  { sport:'Soccer', country:'EN', match:'Arsenal vs. Liverpool', venue:'The Football Factory', vtype:'Sports Bar', neighborhood:'East Village', borough:'Manhattan', distance:4.1, time:'Sat · 9:00 AM', perks:['Pints'], live:false, when:'This weekend', lat:40.7295, lng:-73.9870, eventType:'watch-party', price:'No cover' },
  { sport:'Soccer', country:'US', match:'USA vs. Mexico', venue:'Washington Square Park', vtype:'Park', neighborhood:'Greenwich Village', borough:'Manhattan', distance:5.2, time:'Tonight · 8:00 PM', perks:['Free','Big Crowd'], live:true, when:'Tonight', lat:40.7308, lng:-73.9973, eventType:'watch-party', price:'Free' },
  { sport:'Soccer', country:'MX', match:'USA vs. Mexico', venue:'Tortilleria Nixtamal', vtype:'Restaurant', neighborhood:'Corona', borough:'Queens', distance:7.5, time:'Tonight · 8:00 PM', perks:['Tacos'], live:true, when:'Tonight', lat:40.7460, lng:-73.8580, eventType:'watch-party', price:'No cover' },
  { sport:'NBA', country:'US', match:'Knicks Championship Parade', venue:'Canyon of Heroes', vtype:'Plaza', neighborhood:'Financial District', borough:'Manhattan', distance:6.0, time:'Mon · 11:00 AM', perks:['Free','Confetti'], live:false, when:'This weekend', lat:40.7074, lng:-74.0113, eventType:'parade', price:'Free' },
  { sport:'Soccer', country:'US', match:'Pickup Soccer', venue:'Pier 40', vtype:'Park', neighborhood:'West Village', borough:'Manhattan', distance:5.5, time:'Sun · 9:00 AM', perks:['Free'], live:false, when:'This weekend', lat:40.7282, lng:-74.0107, eventType:'pickup', price:'Free' },
];

export const polls = [
  { country:'AR', borough:'Brooklyn', question:"Best Argentina watch spot in Brooklyn?", sub:'Brooklyn · Saturday match', closes:'Closes in 3h', options:[
    { name:'La Boqueria', votes:284 },
    { name:'McCarren Park Lawn', votes:412 },
    { name:'Bedford Brewery', votes:156 },
  ]},
  { country:'US', borough:'Brooklyn', question:"Where to host the Knicks Game 7 watch?", sub:'Brooklyn · Community vote', closes:'Closes Friday', options:[
    { name:'Brooklyn Brewery', votes:520 },
    { name:'Prospect Park Bandshell', votes:840 },
    { name:'Domino Park LED Wall', votes:391 },
  ]},
  { country:'BR', borough:'Brooklyn', question:"Best caipirinha spot for the Brazil match?", sub:'Brooklyn · Vote', closes:'Closes Sat', options:[
    { name:'Miss Favela', votes:198 },
    { name:'Beco', votes:142 },
    { name:'Rio Market', votes:87 },
  ]},
  { country:'US', borough:'Manhattan', question:"Top Manhattan rooftop for Knicks playoffs?", sub:'Manhattan · Community vote', closes:'Closes Friday', options:[
    { name:'Westlight', votes:412 },
    { name:'Magic Hour', votes:238 },
  ]},
];

export const schedule = [
  { country:'AR', sport:'Soccer', home:{name:'Argentina', flag:'🇦🇷'}, away:{name:'Brazil', flag:'🇧🇷'}, tournament:'Copa America', date:'Sat · 4:00 PM', venue:'Maracanã' },
  { country:'AR', sport:'Soccer', home:{name:'Argentina', flag:'🇦🇷'}, away:{name:'Uruguay', flag:'🇺🇾'}, tournament:'Copa America', date:'Wed · 8:00 PM', venue:'Monumental' },
  { country:'US', sport:'Soccer', home:{name:'USA', flag:'🇺🇸'}, away:{name:'Mexico', flag:'🇲🇽'}, tournament:'CONCACAF', date:'Tonight · 8:00 PM', venue:'AT&T Stadium' },
  { country:'US', sport:'NBA', home:{name:'Knicks', flag:''}, away:{name:'Celtics', flag:''}, tournament:'NBA Playoffs', date:'Tonight · 7:30 PM', venue:'MSG' },
  { country:'BR', sport:'Soccer', home:{name:'Brazil', flag:'🇧🇷'}, away:{name:'Argentina', flag:'🇦🇷'}, tournament:'Copa America', date:'Sat · 4:00 PM', venue:'Maracanã' },
  { country:'EN', sport:'Soccer', home:{name:'England', flag:'🏴󠁧󠁢󠁥󠁮󠁧󠁿'}, away:{name:'Spain', flag:'🇪🇸'}, tournament:'Euro Qualifier', date:'Sun · 11:00 AM', venue:'Wembley' },
];

export const lineups = {
  AR: { team:'Argentina', formation:'4-3-3', color:['#7DB9E8','#3074C0'], rows:[
    [{num:11,name:'Di Maria'},{num:10,name:'Messi',c:true},{num:9,name:'Alvarez'}],
    [{num:8,name:'Mac Allister'},{num:5,name:'Paredes'},{num:20,name:'De Paul'}],
    [{num:3,name:'Tagliafico'},{num:13,name:'Romero'},{num:25,name:'Otamendi'},{num:26,name:'Molina'}],
    [{num:23,name:'E. Martinez'}]
  ]},
  US: { team:'USA', formation:'4-2-3-1', color:['#3b82f6','#1e3a8a'], rows:[
    [{num:9,name:'Balogun'}],
    [{num:7,name:'Reyna'},{num:10,name:'Pulisic',c:true},{num:11,name:'Weah'}],
    [{num:8,name:'McKennie'},{num:4,name:'Adams'}],
    [{num:5,name:'Robinson'},{num:3,name:'Ream'},{num:13,name:'Richards'},{num:2,name:'Dest'}],
    [{num:1,name:'Turner'}]
  ]},
  BR: { team:'Brazil', formation:'4-3-3', color:['#FFD53A','#0D7D2A'], rows:[
    [{num:7,name:'Vinicius Jr.'},{num:9,name:'Endrick'},{num:10,name:'Rodrygo'}],
    [{num:8,name:'Bruno G.'},{num:5,name:'Casemiro',c:true},{num:11,name:'Raphinha'}],
    [{num:6,name:'Wendell'},{num:4,name:'Marquinhos'},{num:3,name:'Militão'},{num:2,name:'Danilo'}],
    [{num:1,name:'Alisson'}]
  ]},
  EN: { team:'England', formation:'4-3-3', color:['#ffffff','#1e3a8a'], rows:[
    [{num:7,name:'Saka'},{num:9,name:'Kane',c:true},{num:11,name:'Foden'}],
    [{num:10,name:'Bellingham'},{num:4,name:'Rice'},{num:8,name:'Mainoo'}],
    [{num:3,name:'Shaw'},{num:6,name:'Maguire'},{num:5,name:'Stones'},{num:2,name:'Walker'}],
    [{num:1,name:'Pickford'}]
  ]},
};

export const chatMessages = {
  AR: [{user:'lionel_88',msg:'VAMOS ARGENTINA!! 🇦🇷 see you at La Boqueria'},
       {user:'mariana_b',msg:'McCarren Park is filling up already'},
       {user:'pablo_g',msg:'who else getting matching jerseys?'}],
  US: [{user:'jake_nyc',msg:'USA USA USA 🇺🇸 anyone for Washington Sq?'},
       {user:'samantha_p',msg:'Pulisic is gonna cook tonight'},
       {user:'mike_dl',msg:"Foley's is packed already, get there early"}],
  BR: [{user:'rafa_sp',msg:'Miss Favela é o melhor lugar 🇧🇷'},
       {user:'isabela_r',msg:'Trazendo o tambor!! lets gooo'}],
  EN: [{user:'oli_uk',msg:'COME ON ENGLAND'},
       {user:'harry_l',msg:'Football Factory has the away pub experience nailed'}],
};
