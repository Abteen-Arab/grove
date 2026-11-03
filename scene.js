/** Original code-native habitat art. Growth controls the landscape; species control its inhabitants. */
let sceneNumber = 0;
const bound = value => Math.min(1, Math.max(0, Number(value) || 0));
const escape = value => String(value).replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const drawings = {
  oak: `<ellipse cy="-1" rx="38" ry="12" fill="#4B6544" opacity=".15"/><path d="M-6-93 4-94 7-2-6 1Z" fill="#8B7050"/><path d="M0-46-22-69-18-73 2-58 24-82 28-78 5-48Z" fill="#8B7050"/><path d="M-50-77-56-94-48-109-49-125-31-140-14-141 0-151 21-147 32-135 47-131 56-112 52-96 57-84 41-68 19-66 4-60-17-67-36-65Z" fill="#6B8D50"/><path d="M-49-125-31-140-14-141 0-151 21-147 29-133 5-122-18-125-34-110Z" fill="#A3B572"/><path d="M5-122 29-133 47-131 56-112 52-96 33-93 20-106Z" fill="#86A15B"/><path d="M-50-77-56-94-48-109-34-110-18-95-17-67-36-65Z" fill="#587B49"/><path d="M-18-125 5-122 20-106 12-85-18-95-34-110Z" fill="#7B9855"/><path d="M12-85 33-93 52-96 57-84 41-68 19-66 4-60-17-67-18-95Z" fill="#547B47"/>`,
  pine: `<ellipse cy="-1" rx="31" ry="10" fill="#46624A" opacity=".16"/><path d="M-5-63H5L7 0H-6Z" fill="#8C7551"/><path d="M-48-35 0-119 47-35 12-23H-14Z" fill="#426C4B"/><path d="M0-119 47-35 12-23 0-37Z" fill="#315A42"/><path d="M-41-64 0-137 40-64 5-52Z" fill="#63884F"/><path d="M0-137 40-64 5-52 0-71Z" fill="#456E48"/><path d="M-29-93 0-151 29-93 4-85Z" fill="#9AAF6F"/><path d="M0-151 29-93 4-85 0-108Z" fill="#6E9058"/>`,
  fern: `<ellipse cy="0" rx="25" ry="6" fill="#4D7045" opacity=".13"/><path d="M0 0Q-1-28-3-44M0 0Q-13-23-31-30M0 0Q17-25 34-30" stroke="#5D824E" stroke-width="3" stroke-linecap="round"/><path d="m-3-38-8-8-1 12 9 6m1-1-11-8 2 13 10 4m1-5 9-12 2 13-10 7m-18 0-12-4 4 10 13 2m-7-12-13-4 5 10 12 2m26 3 10-13 4 12-11 7m8-17 10-11 3 10-12 8M-1-5l-19-4 9 10 11 2m4-7 18-8-6 12-13 3" fill="#789B59"/><path d="m-3-38 5-10 5 10-9 10m-1 22-10-6 3 10 10 4m4-10 10-10-1 11-10 7" fill="#91AB68"/>`,
  flowers: `<path d="M-11 0v-27M9 1v-36M23 0v-19M-11-10l-6-5M9-13l8-6" stroke="#75954F" stroke-width="2.6" stroke-linecap="round"/><path d="m-12-34 5 2 2 6-5 5-6-2-2-6ZM8-44l6 2 3 7-6 6-8-3-1-7ZM23-27l5 4-1 6-6 2-5-5 2-6Z" fill="#F3DBAB"/><circle cx="-11" cy="-27" r="2.5" fill="#C7A45E"/><circle cx="9" cy="-36" r="3" fill="#C7A45E"/><circle cx="23" cy="-21" r="2.5" fill="#C7A45E"/><path d="M-8-7q-9-2-12 3 7 4 12-3M11-8q8-9 14-7-2 8-14 7" fill="#86A35F"/>`,
  rabbit: `<ellipse cy="3" rx="25" ry="7" fill="#4D7045" opacity=".14"/><path d="M-23-11-19-25-8-32 8-27 16-14 12-3-16-2Z" fill="#D6CBA7"/><path d="M7-26 3-51 9-57 15-50 14-28 20-48 26-49 29-42 22-22Z" fill="#DBD2B4"/><path d="M9-49 11-34 12-48ZM22-41l-3 13 5-13Z" fill="#BEA593"/><path d="m8-28 15-3 11 10-5 13-19 3-7-13Z" fill="#E9DFC1"/><path d="m18-7 12-1 6 6-19 1-2-3m-27-4 15 2 2 6h-22Z" fill="#C1B48E"/><path d="m-24-17-7 3 1 8 8 1 5-7Z" fill="#EDE5CD"/><circle cx="25" cy="-21" r="2" fill="#4C5841"/><path d="m32-16 3 2-4 2Z" fill="#AB8C78"/>`,
  butterfly: `<path class="habitat-wing" d="M-2-13Q-21-41-31-22q-4 16 23 19-26 3-16 18 12 12 23-13Z" fill="#D7AE68"/><path class="habitat-wing other-wing" d="M2-13Q21-41 31-22q4 16-23 19 26 3 16 18Q12 27 1 2Z" fill="#E9CA85"/><path d="M-3-13 0 8 3-13 0-20Z" fill="#64734D"/><path d="m-1-18-6-8m8 8 6-8" stroke="#64734D" stroke-width="1.7" stroke-linecap="round"/><path d="m-13-20-8-7 1 12 10 5Zm25 0 8-7-1 12-10 5Z" fill="#F0D79D"/>`,
  fish: `<path d="m-17-10 12-5 19 5 10 10-11 9-18 3-13-6-15 6 4-12-4-12Z" fill="#D9A665"/><path d="m-5-15 7-7 10 12m-4 19-5 9-9-9" fill="#B98A57"/><path d="m-5-15 19 5 10 10-17-2-18-3Z" fill="#F0C78A"/><circle cx="15" cy="-2" r="2.1" fill="#475F50"/><path d="m-3-5-7 7 9 2Z" fill="#E7BD7B"/>`,
  frog: `<ellipse cy="3" rx="23" ry="5" fill="#4D7045" opacity=".14"/><path d="m-17-6 1-12 10-8 14 1 9 10-1 11-16 5Z" fill="#7F9D5B"/><path d="m-16-7-10 1-5 9 18-1 8-7m21-2 10 1 4 8-18-1-7-7" fill="#6E8B50"/><path d="m-15-18 1-9 8-3 7 7 7-6 9 4 2 10-8 8-18-1Z" fill="#A6B878"/><circle cx="-8" cy="-24" r="3" fill="#455D43"/><circle cx="13" cy="-23" r="3" fill="#455D43"/><path d="M-7-12q8 6 15 0" stroke="#5F7948" stroke-width="2" stroke-linecap="round"/>`,
  fox: `<ellipse cy="3" rx="33" ry="8" fill="#4D7045" opacity=".14"/><path d="m-17-14-19-1-12-23 16 3 22 17Z" fill="#BD8755"/><path d="m-48-38 16 3-5 14Z" fill="#EFE1BF"/><path d="m-20-15 29-5 14 12-9 12-30-2Z" fill="#C58D58"/><path d="m9-20 1-17 10 7 11-2 8 13-9 12-18-1Z" fill="#D5A164"/><path d="m10-37 8 9 2-2Z" fill="#746244"/><path d="m31-32-4 14 11-1-8 12-14-1Z" fill="#EFE1BF"/><path d="m-14 1-2 10h7l4-10m17-2 2 11h7l-4-12" fill="#8B7050"/><circle cx="30" cy="-22" r="2" fill="#455640"/><path d="m38-20 3 2-3 3Z" fill="#455640"/>`,
  deer: `<ellipse cx="-3" cy="5" rx="37" ry="9" fill="#4D7045" opacity=".13"/><path d="m-33-34 27-11 25 15-4 23-42 2Z" fill="#B49468"/><path d="m9-27 5-37 12-7 11 16-7 38-15 10Z" fill="#C5A376"/><path d="m18-64 0-14 8 8 13-4 15 12-5 11-22 1Z" fill="#C9AB7E"/><path d="m18-78-5-7-2 12 8 7m15-7 9-11 1 12-5 3" fill="#AE8D62"/><path d="m32-58 17 0-2 7-17-1Z" fill="#E6D8B9"/><path d="m-28-10-3 26h6l8-25m22-2 3 27h6l-1-29m-35 3 1 26h6l2-28" fill="#8C7755"/><path d="m-32-31-9-4 5 10 7 3" fill="#D6BB91"/><path d="m-18-34 4-1 2 4-4 1Zm11 4 4-2 2 4-4 1Zm-15 5 4-1 1 4-4 1Z" fill="#EDDFC0"/><circle cx="39" cy="-63" r="2" fill="#4B5D43"/><path d="m51-63 4 1-2 4Z" fill="#526046"/>`,
  heron: `<ellipse cx="0" cy="5" rx="21" ry="5" fill="#4D7045" opacity=".12"/><path d="m-7-15-2 36 9 1m7-38 5 30 8 2" stroke="#A58C60" stroke-width="2.7" stroke-linecap="round"/><path d="m-24-30 14-20 27 12 1 18-19 7-17-9Z" fill="#BFC8B3"/><path d="m-24-30 14-20 13 10-6 21-15-3Z" fill="#8DAB9C"/><path d="M9-33q23-9 9-26-11-13-2-24 4-6 12-3l4 8-9 5q1 6 8 16 13 24-14 37Z" fill="#D3D8C4"/><path d="m28-86 21 7-18 4Z" fill="#C7A163"/><path d="m17-84-7-6 16 3Z" fill="#617D70"/><circle cx="27" cy="-81" r="1.9" fill="#496250"/>`,
  otter: `<ellipse cy="3" rx="31" ry="7" fill="#567362" opacity=".15"/><path d="m-19-10-22 8-8-6 25-14Z" fill="#977A59"/><path d="m-22-17 12-18 24 2 12 17-12 16-24-1Z" fill="#9C805D"/><path d="m9-28 1-17 8-5 9 5 10-1 10 10-6 14-22 5Z" fill="#A98D68"/><path d="m20-24 14-5 11 3-4 4-22 5Z" fill="#D4C7A8"/><path d="m10-46 5-8 8 7m10 2 7-7 5 10" fill="#A98D68"/><path d="m-7-13 12-2 8 6-16 5m20-12 11-3 5 5-12 6" fill="#806D51"/><circle cx="34" cy="-36" r="2" fill="#435847"/><path d="m44-33 4 2-3 4Z" fill="#435847"/><path d="m39-25 10 1m-10 2 9 4" stroke="#8F7A5B" stroke-width="1.2" stroke-linecap="round"/>`
};
const labels = {oak:'Oak',pine:'Pine',fern:'Fern',flowers:'Wildflowers',rabbit:'Rabbit',butterfly:'Butterfly',fish:'Pond fish',frog:'Frog',fox:'Fox',deer:'Deer',heron:'Heron',otter:'Otter'};
const stone = `<path d="m-15-1 7-12 17-2 14 11-6 9-21 2Z" fill="#AAB397"/><path d="m-15-1 7-12 17-2-4 14Z" fill="#CFCEAC"/><path d="m5-1 18-3-6 9-21 2Z" fill="#95A589"/>`;
const twig = `<path d="M0 0v-39M0-16-12-12M0-25l10-9" stroke="#9D8D63" stroke-width="4" stroke-linecap="round"/><path d="M0-26q-20-14-20-1 9 8 20 1M1-17q20-16 20-3-10 9-20 3" fill="#93AA6B"/>`;

/** Small original species illustration for field-guide tiles; unknown IDs show a seedling. */
export function renderSpeciesIcon(id) {
  const key = Object.prototype.hasOwnProperty.call(drawings, id) ? id : null;
  const drawing = key ? drawings[key] : twig;
  const tree = key === 'oak' || key === 'pine';
  const scale = tree ? .48 : key === 'deer' || key === 'heron' ? .83 : key === 'flowers' ? 1.25 : key === 'fern' ? 1.05 : 1;
  const y = tree ? 88 : key === 'heron' ? 77 : key === 'deer' ? 79 : key === 'butterfly' || key === 'fish' ? 57 : 78;
  const x = key === 'deer' || key === 'heron' ? 46 : key === 'fox' || key === 'otter' ? 51 : key === 'flowers' ? 41 : 50;
  return `<svg class="species-art" fill="none" viewBox="0 0 100 100" role="img" aria-label="${labels[key] || 'Seedling'}" xmlns="http://www.w3.org/2000/svg"><g transform="translate(${x} ${y}) scale(${scale})">${drawing}</g></svg>`;
}

/** @param {{growth?:{woodland?:number,meadow?:number,pond?:number},species?:Array<string|{id:string}>,level?:number,score?:number}} habitat */
export function renderHabitatScene(habitat = {}, options = {}) {
  const {woodland:w=0, meadow:m=0, pond:p=0} = Object.fromEntries(['woodland','meadow','pond'].map(key => [key,bound(habitat.growth?.[key])]));
  const species = new Set((Array.isArray(habitat.species) ? habitat.species : []).map(item => typeof item === 'string' ? item : item?.id));
  const level = Math.min(3, Math.max(0, Math.round(Number(habitat.level) || 0)));
  const score = Math.round(bound(Number(habitat.score) / 100) * 100);
  const prefix = String(options.idPrefix || `habitat-${++sceneNumber}`).replace(/[^a-zA-Z0-9_-]/g,'') || `habitat-${++sceneNumber}`;
  const use = (id,x,y,scale=1,extra='') => `<g transform="translate(${x} ${y}) scale(${scale})" ${extra}><use href="#${prefix}-${id}"/></g>`;
  const animal = (id,x,y,scale=1,extra='') => species.has(id) ? use(id,x,y,scale,`class="habitat-animal habitat-${id}" ${extra}`) : '';
  const trees = [
    [303,265,1,'oak'],[226,256,.8,'oak'],[383,250,.77,'pine'],[172,291,.88,'pine'],[319,219,.65,'pine'],[270,313,.68,'oak'],[409,292,.67,'oak'],[204,324,.61,'pine'],[363,321,.58,'pine'],[155,317,.51,'oak'],[423,317,.46,'pine']
  ].slice(0,Math.min(11,1+Math.round(w*10))).sort((a,b)=>a[1]-b[1]).map(([x,y,size,type]) => {
    const available = species.has(type) ? type : species.has('oak') ? 'oak' : species.has('pine') ? 'pine' : 'seedling';
    return use(available,x,y,(.42+.58*w)*size);
  }).join('');
  const flowerPoints = [[168,345],[207,365],[246,344],[281,384],[318,358],[352,397],[232,397],[189,327],[385,377],[309,409],[429,390],[145,321],[366,341],[254,370],[400,413],[474,399]];
  const flowers = species.has('flowers') ? flowerPoints.slice(0,2+Math.round(m*14)).map(([x,y],i)=>use('flowers',x,y,(.3+.27*m)*(i%3===0?1.2:1))).join('') : '';
  const ferns = species.has('fern') ? [[144,300],[241,289],[354,301],[388,356],[287,414],[476,385]].slice(0,2+Math.round(m*4)).map(([x,y],i)=>use('fern',x,y,.45+.1*(i%2))).join('') : '';
  const grassPoints = [[125,301],[173,344],[215,349],[252,385],[293,360],[345,407],[392,387],[427,418],[472,401],[596,315],[623,302],[407,219],[441,237],[536,284],[564,385]];
  const grass = grassPoints.slice(0,4+Math.round(m*11)).map(([x,y],i)=>`<path d="m${x-4} ${y} 4-${7+i%4} 2 7m-2-3 4-4 2 7" stroke="${m>.5?'#789658':'#A5AA78'}" stroke-width="2" stroke-linecap="round"/>`).join('');
  const pondScale = .24+.76*p;
  const animals = ['rabbit','butterfly','fish','frog','fox','deer','heron','otter'].filter(id=>species.has(id));
  const description = `${level === 3 ? 'Flourishing' : level === 2 ? 'Growing' : level === 1 ? 'Young' : 'Quiet'} habitat. Woodland ${Math.round(w*100)} percent, meadow ${Math.round(m*100)} percent, pond ${Math.round(p*100)} percent. ${animals.length ? `Wildlife: ${animals.map(id=>labels[id]).join(', ')}.` : 'Wildlife will arrive as the habitat grows.'} Balance score ${score}.`;
  return `<svg class="habitat-scene${options.animate === false ? ' habitat-still' : ''}" data-habitat-level="${level}" data-woodland="${w.toFixed(2)}" data-meadow="${m.toFixed(2)}" data-pond="${p.toFixed(2)}" viewBox="0 0 720 500" fill="none" role="img" aria-labelledby="${prefix}-title ${prefix}-desc" xmlns="http://www.w3.org/2000/svg"><title id="${prefix}-title">Your living habitat</title><desc id="${prefix}-desc">${escape(description)}</desc>
  <defs>
    <filter id="${prefix}-shadow" x="-30%" y="-100%" width="160%" height="300%"><feGaussianBlur stdDeviation="8"/></filter>
    <linearGradient id="${prefix}-earth" x1="350" y1="290" x2="350" y2="470" gradientUnits="userSpaceOnUse"><stop stop-color="#AF9668"/><stop offset="1" stop-color="#8C7753"/></linearGradient>
    <linearGradient id="${prefix}-ground" x1="180" y1="150" x2="540" y2="420" gradientUnits="userSpaceOnUse"><stop stop-color="${m>.55?'#B6C781':'#C1C292'}"/><stop offset="1" stop-color="${m>.55?'#98B573':'#AFB384'}"/></linearGradient>
    <linearGradient id="${prefix}-water" x1="480" y1="286" x2="550" y2="385" gradientUnits="userSpaceOnUse"><stop stop-color="${p>.55?'#81B4A7':'#A1AD8E'}"/><stop offset="1" stop-color="${p>.55?'#639B95':'#899B82'}"/></linearGradient>
    ${Object.entries(drawings).map(([id,drawing])=>`<g id="${prefix}-${id}">${drawing}</g>`).join('')}<g id="${prefix}-stone">${stone}</g><g id="${prefix}-seedling">${twig}</g>
  </defs>
  <style>
    .habitat-scene .habitat-water-shine{animation:grove-water-shine 5s ease-in-out infinite}.habitat-scene .habitat-butterfly-inner{animation:grove-butterfly-float 6s ease-in-out infinite;transform-box:fill-box;transform-origin:center}.habitat-scene .habitat-wing{animation:grove-wingbeat 2s ease-in-out infinite;transform-box:fill-box;transform-origin:right center}.habitat-scene .other-wing{transform-origin:left center;animation-delay:-.15s}.habitat-scene .habitat-fish-inner{animation:grove-fish-drift 9s ease-in-out infinite;transform-box:fill-box;transform-origin:center}.habitat-scene .second-fish{animation-delay:-4s}.habitat-scene.habitat-still *{animation:none!important}
    @keyframes grove-water-shine{0%,100%{opacity:.3}50%{opacity:.7}}@keyframes grove-butterfly-float{0%,100%{transform:translate(0,0) rotate(-5deg)}50%{transform:translate(7px,-9px) rotate(6deg)}}@keyframes grove-wingbeat{0%,100%{transform:scaleX(1)}50%{transform:scaleX(.65)}}@keyframes grove-fish-drift{0%,100%{transform:translateX(-5px) rotate(-3deg)}50%{transform:translateX(7px) rotate(4deg)}}@media(prefers-reduced-motion:reduce){.habitat-scene *{animation:none!important}}
  </style>
  <ellipse cx="361" cy="446" rx="224" ry="19" fill="#596D4E" opacity=".14" filter="url(#${prefix}-shadow)"/>
  <path d="M65 275 335 137Q360 124 386 138L658 275Q678 284 663 309L398 454Q364 472 332 455L67 314Q50 300 65 275Z" fill="url(#${prefix}-earth)"/>
  <path d="M360 300 666 286 663 309 398 454Q380 465 360 466Z" fill="#8D784F" opacity=".38"/>
  <path d="m88 313 11 19 25 13-7-19ZM162 350l17 33 25 14-9-29ZM295 422l12 21 21 11-6-23ZM423 424l-3 18 22-12 4-18ZM541 362l-8 24 18-10 7-22ZM616 322l-7 22 20-12 5-20Z" fill="#C5AD7B" opacity=".45"/>
  <path d="M65 272 335 133Q360 120 386 134L658 271Q682 283 659 298L388 440Q363 453 337 440L65 299Q41 286 65 272Z" fill="url(#${prefix}-ground)" stroke="#CDD6A0" stroke-width="5"/>
  <path d="m90 286 154-76 59 41-94 49Z" fill="#D0D4A4" opacity=".35"/>
  <path d="m338 159 148 59-66 51-125-47Z" fill="#C5CF92" opacity=".36"/>
  <path d="M116 303q61-29 119-7t127 13q55 27 98 70l-80 47q-29 14-54-1Z" fill="${m>.55?'#B7CA80':'#C8C894'}" opacity="${.32+.38*m}"/>
  <path d="M126 273 283 195l137 66-112 86Z" fill="#7A9F62" opacity="${.06+.16*w}"/>
  <g transform="translate(520 336) scale(${pondScale.toFixed(3)}) translate(-520 -336)">
    <path d="M411 327c-4-19 22-24 39-40 20-18 37-20 61-7 22 12 45-4 65 11 25 17 58 19 49 43-6 18-29 26-39 42-11 19-40 23-60 12-18-10-35 2-58-11-20-10-54-23-57-50Z" fill="#C3CC9A"/>
    <path d="M419 326c-4-15 24-22 39-35 18-15 32-14 52-3 23 12 44-3 63 10 24 16 51 17 43 35-7 15-30 25-39 39-10 15-31 16-48 8-21-10-37 1-57-11-22-12-49-22-53-43Z" fill="url(#${prefix}-water)"/>
    <path d="M436 323q29-19 45-15t45-4m15 66q22 5 41-15m-133-9q22 13 39 14" class="habitat-water-shine" stroke="${p>.55?'#BAD3BA':'#C2CAAD'}" stroke-width="3" stroke-linecap="round"/>
    ${species.has('fish')?`<g transform="translate(502 328) scale(.76)"><g class="habitat-fish-inner">${drawings.fish}</g></g><g transform="translate(555 352) scale(-.62 .62)"><g class="habitat-fish-inner second-fish">${drawings.fish}</g></g>`:''}
    ${p>.45?`<path d="m608 325 4-35m-3 24-8-13m9 2 7-10M441 304l-8-25m6 17-11-7m8-1 3-10" stroke="#789557" stroke-width="3" stroke-linecap="round"/><path d="m611 290 2-11m-80 113 5-20m-1 8 5-7" stroke="#B4B37A" stroke-width="4" stroke-linecap="round"/>`:''}
  </g>
  ${use('stone',451,299,.7)}${use('stone',587,382,.8)}${use('stone',563,388,.4)}
  ${grass}
  ${trees}
  ${ferns}${flowers}
  ${animal('deer',315,336,.73)}
  ${animal('rabbit',211,364,.8)}
  ${animal('fox',383,398,.85)}
  ${animal('frog',592,376,.75)}
  ${animal('heron',615,315,.88)}
  ${animal('otter',478,382,.76)}
  ${species.has('butterfly')?`<g transform="translate(324 199) scale(.56)"><g class="habitat-butterfly-inner">${drawings.butterfly}</g></g><g transform="translate(244 333) scale(.43)"><g class="habitat-butterfly-inner" style="animation-delay:-3s">${drawings.butterfly}</g></g>`:''}
  ${use('stone',158,312,.64)}${use('stone',411,418,.6)}
  ${level>=2?'<path d="M503 175q7-6 13 0m0 0q6-7 12-2M160 200q5-5 10 0m0 0q5-6 11-1" stroke="#718E63" stroke-width="2.5" stroke-linecap="round"/>':''}
  </svg>`;
}
