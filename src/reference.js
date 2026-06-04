// Static reference data (countries) — used for the country filter bar and
// for classifying whether an event is a "World Cup" (national-team) event.

export const countries = [
  { code:'US', name:'USA',         flag:'🇺🇸' },
  { code:'AR', name:'Argentina',   flag:'🇦🇷' },
  { code:'BR', name:'Brazil',      flag:'🇧🇷' },
  { code:'EN', name:'England',     flag:'🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { code:'ES', name:'Spain',       flag:'🇪🇸' },
  { code:'FR', name:'France',      flag:'🇫🇷' },
  { code:'DE', name:'Germany',     flag:'🇩🇪' },
  { code:'IT', name:'Italy',       flag:'🇮🇹' },
  { code:'MX', name:'Mexico',      flag:'🇲🇽' },
  { code:'PT', name:'Portugal',    flag:'🇵🇹' },
  { code:'NL', name:'Netherlands', flag:'🇳🇱' },
  { code:'JP', name:'Japan',       flag:'🇯🇵' },
  { code:'BE', name:'Belgium',     flag:'🇧🇪' },
  { code:'HR', name:'Croatia',     flag:'🇭🇷' },
  { code:'CH', name:'Switzerland', flag:'🇨🇭' },
  { code:'DK', name:'Denmark',     flag:'🇩🇰' },
  { code:'SE', name:'Sweden',      flag:'🇸🇪' },
  { code:'AT', name:'Austria',     flag:'🇦🇹' },
  { code:'TR', name:'Turkey',      flag:'🇹🇷' },
  { code:'PL', name:'Poland',      flag:'🇵🇱' },
  { code:'AU', name:'Australia',   flag:'🇦🇺' },
  { code:'CA', name:'Canada',      flag:'🇨🇦' },
  { code:'KR', name:'South Korea', flag:'🇰🇷' },
  { code:'SA', name:'Saudi Arabia',flag:'🇸🇦' },
  { code:'MA', name:'Morocco',     flag:'🇲🇦' },
  { code:'SN', name:'Senegal',     flag:'🇸🇳' },
  { code:'CM', name:'Cameroon',    flag:'🇨🇲' },
  { code:'GH', name:'Ghana',       flag:'🇬🇭' },
  { code:'NG', name:'Nigeria',     flag:'🇳🇬' },
  { code:'CI', name:"Côte d'Ivoire", flag:'🇨🇮' },
  { code:'IR', name:'Iran',        flag:'🇮🇷' },
  { code:'QA', name:'Qatar',       flag:'🇶🇦' },
  { code:'UY', name:'Uruguay',     flag:'🇺🇾' },
  { code:'CO', name:'Colombia',    flag:'🇨🇴' },
  { code:'CL', name:'Chile',       flag:'🇨🇱' },
  { code:'PE', name:'Peru',        flag:'🇵🇪' },
  { code:'EC', name:'Ecuador',     flag:'🇪🇨' },
  { code:'CR', name:'Costa Rica',  flag:'🇨🇷' },
  { code:'EG', name:'Egypt',       flag:'🇪🇬' },
  { code:'NO', name:'Norway',      flag:'🇳🇴' },
  { code:'IS', name:'Iceland',     flag:'🇮🇸' },
  { code:'IE', name:'Ireland',     flag:'🇮🇪' },
];

const nationNames = countries.map((c) => c.name);

export function isWorldCupMatch(match) {
  if (!match) return false;
  return nationNames.some((n) => match.includes(n));
}
