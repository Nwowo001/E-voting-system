import XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';

const rawText = `
-- LEVEL 100 --
1 . Bademosi teniola Victoria,  matric number:25co1019
bademositeniola@gmail.com
2. Adekunle Eniola Adekemi
Matric number: 25CO1004 
eadekuunle1509@gmail.com
3..Oladipo Tomiwa Emmanuel, Matric no:25C1045 , emanuelferanmi1@gmail.com
4.Oyewole Emmanuel,matric : 25C01053,emzyrichie30@gmail.com
5.Ahmadu Abubakar Temitope
Matric no: 25C01011
aahmaduabu24@gmail.com
6
Babalola akorede Anthony 
Matric number:25C01018
babalolaakoredeanthony2007@gmail.com
    7. Osinusi Damilola Ireyimika 
        Matric number:25co1049
  osinusidamilola@gmail.com
8. Folorunso Samuel Olusegun
        Matric number: 25co1026
    folorunsosamuel641@gmail.com
9.Nwachukwu Oreoluwa 
         Matric number: 25c01058
        Nwachukwuoreoluwa@gmail.com
10.
Azeez Babatunde Alabi

Matric number:
25c01017

Samuelmoses1678@gmail.com

11. Nnadozie divine 
25c01034
ebubennadozie23@gmail.com

12. Ayinde Williams
25c01015
williamsayinde73@gmail.com
13.Adeyemo Isaiah Ademuyiwa 
25C01009
ademuyiwaisaiah148@gmail.com
14.Titilola Maryam Moradeke 
25C01056
nikky7043@gmail.com
.15.Akanji olanrewaju 
25C01012 
akanjiolanrewaju12@gmail.com
16.Marizu Nnadiogo 
25c01032
nnadiogo934@gmail.com
17.Alawode Oyinkansola 
 
Matric number:24N02080
oyinkansolaalawode98@gmail.com
18.adekunle tolulope Emmanuel 
     Matric number:25C01003
     adekunletolulope140@gmail.com
 
19.. Oyewole Testimony David 
MATRIC NO: 25c01054
davidoyewole945@gmail.com
 
20. Adeleke Ayomide jesudamilare 
     Matric number: 25C01005
ayom9270@gmail.com
21.Adeleye Ebenezer 
Matric no:25c01006 
Email: jomilojuebenezer00@gmail.com
22. Fagunleka Israel Itunuoluwa 
Matric : 25C01024
Email : fagunlekaisrael@gmail.com
23. Agbenla yussuf
Matric No: 25C01010 
Email: agbenlaolayiwola@gmail.com
24.Alabi festus oluwabukunmi 
Matric: 25C01014
Email: festusalabi05@gmail.com
 
25.Moses Frank chigozie
 
Matric ; 25C01033
 
26.Ibeawuchi chidera 
Matric number: 25C01027
 
27.Ayo adeosun joy morayo oluwa 
:25C01016
ayoadeosunjoy@gmail.com
 
-- LEVEL 200 --
1. Abimbola mayowa Ifarinu 24N02002 farinuabimbola18@gmail.com
2. Boladale Samuel akorede, 24N02030, samuelakorede77@gmail.com
3. ⁠Ogundipe Julius Olamide 24N02057
Ogundipejulius687@gmail.com
4. Oliver Alexander Akinyemi
       24N02066
oliveralex.ao.2006@gmail.com
 
5. Afelumo OBA Emmanuel 24N02012
obaemmanuel200816@gmail.com
6. Adeleke Malik olamilekan 
24N02009
adelekemalik111@gmail.com
7. olabanji tobiloba peace 24N02062 olabanjitobi02@gmail.com
8. Fenwa Emmanuel Okikiola 24N04003 fenwaemmanuel2@gmail.com
9. Akinboboye isaac boluwarife 24N02019 akinboboyeisaac6@gmail.com
10.  AKERE MOYINOLUWA EMMANUEL 24N02018 moyinoluwaakere@gmail.com
11. Idowu Joseph Adeola 24N02046
 idowujoseph17@gmail.com
12. ONABANJO GABRIEL JOMILOJU  24NO2069
jomilojuonabanjo123@gmail.com
13. Oremade iteoluwakiisi Daniel 24N02070 oremadeiteoluwakiisi@gmail.com
14. ⁠Ekhator Emmanuel Etinosa 24N02036
ekhatoretinosa83@gmail.com
15. Nnabuife Iruomachukwu Favour 24N02053 favournnabuife245@gmail.com
16. Oluwafeyitimi Hephzibah opeyemi 
24N02067 bhuszibah@gmail.com
17. Adegoke Sikiru Babatunde 
24N02006
sikiruadegoke108@gmail.com
18. oladimeji oluwapamilerin Samuel 
24N02063
oladimejioluwapamilerin71@gmail.com
 19. Owolabi Samuel Kolawole 24N02072 
samkwowoo@gmail.com 
20. Oluwajomiloju odedairo 25C01037
Jomilojudyro@gmail.com
21. Egbebunmi Ayomide Favour 24N02034 favouayomide1234@gmail.com
 22. Iweajunwa Michael Obinwanne 24N02048 kylian7mike@gmail.com
 ⁠23. Oluwatobiloba Collins Ojo
       24N02068
       Collinsayo93@gmail.com
24. Abioye Adefolahan Faisal
      24N02003 , folahanfaisal@gmail.com
25. Olaniregun Micheal Precious 
        24N02065
    preciousmicheal28@gmail.com
26. Adeleke Favour Samuel
24N02008
Favoursam6015@gmail.com
27. Matthew Blessing Elizabeth 24N02051
Lizzymatt135@gmail.com 
28. Akinyele Olamide Caleb 25C01013 olamideakin98@gmail.com
29. Dairo Oluwaseun Olayinka 24N02031 oluwaseundairo143@gmail.com
30. Akinola Kenny Patrick 24N02020 kennyakinola65@gmail.com
31. Atanda Ayomikun Israel 24N02026
atandaisrael2@gmail.com
 32. Adesola Emmanuel Oluwanifemi. 24N02011
adesolaemmanueloluwanifemi@gmail.com 
 33.Uyovwievwo precious oghenemaga 
24N02074 
Preciousuyos14@gmail.com
34.Offiah Uchechukwu Williams 24N02056
Offiahuchechukwu46@gmail.com
 
35.Animasawun Emmanuel Akinade 
     24N02025
     renzognfs001@gmail.com
36.Babatunde Daniel kehinde 
24N04001
babatundedanielkehinde488@gmail.com
37. Okon Godisgreat Etim 25C01043  great.okon98@gmail.com
38. Adedigba Faithfulness Okikijesu 24N02005      faithfulnessadedigba20@gmail.com
39. Falana Gbemisola Comfort
      24N02040
    gbemisolafalana15@gmail.com
40. Fagbemi Oluwadara joseph 24N02039 josephfagbemi07@gmail.com
41. Ossai Ngozichukwu Adabel 24N02071
adabelossai@gmail.com
42. Mandy Elvis Uchechukwu 24N02050 mandyelvis117@gmail.com
43. ⁠Ilori Ayomide Elizabeth 24N02047 ilorielizabeth161@gmail.com
44. ⁠Eyitayo Elisha Olumide 24N02038
eyitayoolumide360@gmail.com
45. BADA OLABODE MUHAMMED 
24N02028
Jaradskenchy@gmail.com
46. Obadaye Eniola David 24N02054
eniola.obadaye01@gmail.com
47. Ojumu Praise Oyinkansola 
       24N02059
Praiseojumu06@gmail.com
48. Erengwa ugochukwu Gerald 24N04002
erengwagerald18@gmail.com
49. Emmanuel Alagwuva Uzoeghelu 24N02023 alagwuva@gmail.com
50. Nathaniel Joseph olanrewaju 24N02052
51.Nathaniel Joseph olanrewaju 24N02052
nathanieljoseph2580@gmail.com
52.Okanlawon Ayobami 
24N02060
knlwnayobami@gmail.com
53. Idemudia Nosakhare Michael 24N02045 michaelidemudia262@gmail.com
 
-- LEVEL 300 --
1. Adebayo Mofeolaoluwa 23N02007 mofeadebayo777@gmail.com
2. ⁠Adebanjo David 23N02006
ademidedavid07@gmail.com
3. Adesigbin Oluwatofunmi Jedidiah 23N02015
oluwatofunmijedidiah@gmail.com
4.Enukwu Chiagozie Mikel 23N02043 enukwumikel@gmail.com
5. Adeyemo Bishop Philip 23n02016
bishopadeyemo00@gmail.com
6. Akinwole Oluwatosin Joseph 
23N02029
tosinakinwole35@gmail.com
7. Ola Mary Mosinmiloluwa 23N02065
 sarysinmi1609@gmail.com
8. Ogungbure Samuel Ayomide 
        23N02063
       ogungburesamuel.a@gmail.com
9.Oladoja Felix Olamide 
23N04007
Oladojaolamide77@gmail.com
10. Nwachukwu Chibueze Christian 23N02055 nwachukwuchibueze2004@gmail.com
11. ⁠Solomon Taiwo Oluwatobi 23N02080 tobisolomon66@gmail.com
12. Olajire Boluwatife David 23N02066 boluwatifeolajire713@gmail.com
13. ⁠Bolaji Enoch Tioluwanimi 23N02034                                bolajienoch14@gmail.com
14. ⁠Uzoma Victor Ihechi 23N02086 victorduruuzoma@gmail.com
15. ⁠Onyeka Ikechukwu Joel 23n02074 Onyekaikechukwu2004@gmail.com 
16. ⁠ Nwosu Arinzechukwu Godson    23N02057    arinzenwosu330@gmail.com
17.  Oke Excellence.O 
         24N02061 
Okeexcellence7@gmail.com
18.Omotadowa David kolawole 23N02073
Davidomotadowakolawole@gmail.com
19. Reuben chibuike Raphael 23N02079  reubenchibuike07@gmail.com
20. Abayomi iyanuoluwa michael 23N02001 iyanuoluwamichael123@gmail.com
21. ⁠Adams Ayomide 23N02005 thvgger005@gmail.com
22. Thomas Tamara-preye precious 23N02082 
preyethomas09@gmail.com
23. Abayomi-Owodunni Ayoola
24N02001
ayoolaao1@gmail.com
24. Akintilebo Samuel Olabisi 23N02028
samuelethanjnr@gmail.com
25. Afolabi Boluwatife Amos 23N02019. afolabiboluwatife455@gmail.com
26. ⁠Afolabi olamilekan Abdul Azim 23N02018 olamilekanafolabi999@gmail.com
27. ⁠OLUWALEYE SHALOM AYOMIDE 23N02072 shalomoluwaleye123@gmail.com
28. Olasoji Oluwakemi joy 23N02068
joyolasoji27@gmail.com
29. Uju-Njoku Sallie 23N02084
sallieuju-njoku@gmail.com
30. Ajayi Ayomide Akinniyi 23N04002
ayomideakinniyiajayi07@gmail.com
31. Olateju Tolulope Emmanuel 23N02069               tolulopeolateju49@gmail.com
32. ⁠NKABI JOSHUA NGELE 23N02052 joshuankabi99@gmail.com
33. BRUCE BOLUWATIFE EMMANUEL 23N02035 boluwatifebruce@gmail.com 
34.Adeoye Richard Ayomide 
23n02014 richardadeoye571@gmail.com
 
35. Johnson Oluwanifemi
23n02050
johnsonnifemi56@gmail.com
 
36. Obasoyin Adeife victor 23N02058 obasoyinadeife2006@gmail.com
37. Adedeji Enoch Favour 23N02095  favouradedeji266@gmail.com
38. ⁠IGBU DIVINE EJIROGHENE 23N02048 divineigbu@gmail.com
39. EKE DOMINION CHIDIEBERE 23N02040 chidieberedominion14@gmail.com
40. ⁠AGUNBIADE SAMSON ADESOJI 
23N02092
samsonadesoji1012@gmail.com
41. Iwuchukwu Chinemerem David 23N02049 davidiwuchukwu8@gmail.com
42. Adediwin Oluwatobiloba Moses 23N02011
oaadediwin@gmail.com
43. Ajana Paul Ekunmidayo 23N02023 ajanapaul2@gmail.com
44. Wamah chibuenyim faithful 23N02087 faithfulwamah2@gmail.com
45. ⁠Olawuyi samuel Boluwatife 23N02070 samuelboluwatife32@gmail.com
46. Tijani muiz 23N02083 
Tijanimuiz10@gmail.com
47.Oyejobi Ajiromola Enoch 23N04008
oyejobiajiromola@gmail.com
48.  AYODELE JOSIAH EBUNOLUWA 
23N02031
ayodelejosiahebunoluwa@gmail.com
49. Ndekudu Noble Chidiebere 23N04006
noblendekudu@gmail.com
50. Echefu Richard Chidubem 23N02039
remmrichards@gmail.com
51. Ajaiyeoba John Ajibola 24N02014 ajaiyeobajibola@gmail.com
52. Ogbuchukwu prince chukwubike 23N02062  princeogbu2006@gmail.com
53. Bioku Umar Ayomide 23N04004 umarbioku17@gmail.com
54. ⁠Oguntona Eniola Ayinde 23N02064 eniolaoguntona6@gmail.com
55. Olorunfemi Olamide Enoch 23N02071 olamidekukudodo@gmail.com
56. ⁠Olanpejo Ayomide Praise 23N02067 ayomdiepraize2007@gmail.com
57. ⁠Emma-sede Emmanuel Oshiokalo 23N02041 emmanueljason643@gmail.com
58. ⁠Afolabi Gabriel Oluwatimilehin 23N02017 tanhuncho305@gmail.com
59. Adebowale-david oluwamurewa 23N04001 oluwamurewaadebowale@gmail.com
60. ⁠Nnoli Chukwumeleze- 23N02053- nnolimeleze2006@gmail.com
61. ⁠Uka Jacob Osonwa
23N02085
jakekayuka@gmail.com
62. Adewale adefisayo adewaleadefisayo71@gmail.com 23n02090
63. ⁠Irogho Agbongbai Boluwatife 23n04005 iroghoboluwatife@gmail.com
64. Sotonwa Jonathan 23N02089 timzysotonwa@gmail.com
65. ⁠Akinpelu Timothy Ifeoluwa 23N02096
timothyifeoluwa20@gmail.com
66. Dosunmu Ayomide
23N02037
ayomidedosunmu001@gmail.com
67. Sule-odu Dominion 23N02081 dominionsuleodu5@gmail.com
68. ⁠Akande Isaac Oluwatoyosi ACU20230891TS toyosiakande77@gmail.com
69. Oduyoye Gbemileke 23N02061 oduyoyegbemileke@gmail.com
70. ⁠ Oso Bamidele 23N02075 delediamond633@gmail.com
71. BAMIGBOYE DOMINION OKIKI, davekingston16@gmail.com
72. Amuta Bliss-Ben Egahikowoicho 23N04003 blissbenamuta@gmail.com
73. Francis Ayodele Samuel 24N02043
  ayodelefra52@gmail.com
74. Ebietomiye Oluwafemi 23N02038 oluwafemiebietomiye@gmail.com
 
-- LEVEL 400 --
1. Nwowo Victor Okechukwu 22N02076 victornwowo7@gmail.com
2. Oladunjoye Samuel Faramola 22N02088 oladunjoyesamuel153@gmail.com
3. ⁠Adekunle Judah Oluwagbenga adekunlejudah1@gmail.com
4. Ojo Oluwatishe Joshua ojotishe3@gmail.com
5. Adedeji Adeyeye Mayowa adefolarinm@gmail.com
6. ⁠Ajao Michael Oluwaseun 
michaelajao611@gmail.com
7. Lawal Oluwaseun Adekunle 22N02065 seunlawaladekunke@gmail.com
8. ⁠Okesesan Joel 22N02082 joelniye@gmail.com
9. Olaniyi Ayomide Emmanuel 22N02132. emmyjayomide123@gmail.com
10. ⁠Chris Fallah 22N02118 chrissaahfallah21@gmail.com
11. Akinbola Kelly Ayomide 23N02026 akinbolakelly1@gmail.com
12. ⁠Ugwuegbu David 22N02111
bnugdavid@gmail.com
13. Phillips Stephen 22N02109 phillipsgodwin76@gmail.com
14. Akioye Inioluwa olakanmi 22N02026 inioluwaakioye@gmail.com
15. ⁠Oladosu Qoyum Ayodele qoladosu7@gmail.com
16. ⁠Adesanya Victor Olaoluwa 22N02009 victordebola05@gmail.com
17. ⁠Abayomi Paul Okikiola 22N02001 abayomipaul79@gmail.com
18. ⁠Oguntade Charles 22N02134                oguntadecharles11@gmail.com
19. Olojede Emmanuel Iyanuoluwa 22N02130 olojedeemmanuel95@gmail.com
20. Nnannaadorma Testimony Chiemerie 22N02115 baldc4real@gmail.com
21. ⁠Alo Emmanuel Oluwanifemi 22N02030 tumilaraalo@gmail.com
22. ⁠Babalola Samuel Oluwasemilogo 22N02036 samuelbabalola38@gmail.com
23. Dolapo Ayomide Samuel 22N04004 ayomidedolapo333@gmail.com
24. ⁠Nassar Ibrahim Ayodeji 22N02075 dejinassar@gmail.com
25. Agboola Oluwatimileyin Isaiah  22N02016 agboolatimileyin13@gmail.com
26. Oseni lawal Omobolaji 22N02102 
Osenilawal243@gmail.com
27. Olagunju Jesutosin Emmanuel 22N02090
Olagunjujesutosin@gmail.com
28. Alabi Adedamola 
Alabiadedamola03@gmail.com
 
29. Fasinu David Omotayo
       22N02053
davidfasinu955@gmail.com
`;

function isValidMatric(raw) {
  if (!raw) return false;
  const upper = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  return /^[A-Z0-9]{6,15}$/.test(upper) && /[A-Z]/.test(upper) && /[0-9]/.test(upper);
}

function normalizeMatric(raw) {
  if (!raw) return '';
  let cleaned = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const match = cleaned.match(/^([0-9]{2})([A-Z]{1,2})([0-9O]+)$/);
  if (match) {
    const year = match[1];
    const dept = match[2];
    const num = match[3].replace(/O/g, '0');
    cleaned = year + dept + num;
  }
  return cleaned;
}

function levenshtein(a, b) {
  const tmp = [];
  let i, j, alen = a.length, blen = b.length;
  if (alen === 0) return blen;
  if (blen === 0) return alen;
  for (i = 0; i <= alen; i++) tmp[i] = [i];
  for (j = 0; j <= blen; j++) tmp[0][j] = j;
  for (i = 1; i <= alen; i++) {
    for (j = 1; j <= blen; j++) {
      tmp[i][j] = Math.min(
        tmp[i - 1][j] + 1,
        tmp[i][j - 1] + 1,
        tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return tmp[alen][blen];
}

function areWordsSimilar(w1, w2) {
  if (w1 === w2) return true;
  if (Math.abs(w1.length - w2.length) > 2) return false;
  const dist = levenshtein(w1, w2);
  const maxLen = Math.max(w1.length, w2.length);
  return (1 - dist / maxLen) >= 0.7;
}

function cleanName(name) {
  return name.toLowerCase()
    .replace(/0/g, 'o')
    .replace(/[^a-z]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2);
}

function namesShareWords(name1, name2) {
  const words1 = cleanName(name1);
  const words2 = cleanName(name2);
  return words1.some(w1 => words2.some(w2 => areWordsSimilar(w1, w2)));
}

function parseLevelText(text) {
  const lines = text.split('\n').map(l => l.trim());
  const students = [];
  let currentStudentText = [];

  const entryStartRegex = /^\s*[.]*\s*(\d+)(?:\s*[.]+\s*(.*)|\s+(.*)|$)/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (entryStartRegex.test(line)) {
      if (currentStudentText.length > 0) {
        students.push(parseStudentBlock(currentStudentText.join(' ')));
      }
      currentStudentText = [line];
    } else if (currentStudentText.length > 0 && line !== '') {
      currentStudentText.push(line);
    }
  }
  if (currentStudentText.length > 0) {
    students.push(parseStudentBlock(currentStudentText.join(' ')));
  }

  // Deduplicate students by matric or cleaned name, prioritizing entries with emails
  const uniqueStudents = [];
  students.forEach(s => {
    const sNameClean = cleanName(s.name).join(' ');
    const existing = uniqueStudents.find(x => 
      (s.matric && x.matric && s.matric === x.matric) || 
      (sNameClean && cleanName(x.name).join(' ') === sNameClean)
    );
    if (existing) {
      if (!existing.email && s.email) {
        existing.email = s.email;
      }
      if (!existing.matric && s.matric) {
        existing.matric = s.matric;
      }
    } else {
      uniqueStudents.push(s);
    }
  });

  return uniqueStudents.filter(s => s.name || s.matric || s.email);
}

function parseStudentBlock(blockText) {
  let email = '';
  const emailMatch = blockText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) {
    email = emailMatch[0].toLowerCase().trim();
  }

  let textWithoutEmail = blockText;
  if (emailMatch) {
    textWithoutEmail = textWithoutEmail.replace(emailMatch[0], '');
  }

  let matric = '';
  const matricMatch = textWithoutEmail.match(/\b(?:matric\s*(?:number|no)?|no)\b\s*[:;]?\s*([a-zA-Z0-9-]+)/i);
  if (matricMatch) {
    matric = normalizeMatric(matricMatch[1]);
  } else {
    const rawMatric = textWithoutEmail.match(/(?:[0-9]{2}[A-Z]{1,2}[0-9oO]+[A-Z]*|ACU[0-9]{8}[A-Z]*)/i);
    if (rawMatric) {
      matric = normalizeMatric(rawMatric[0]);
    }
  }

  if (matric && !isValidMatric(matric)) {
    matric = '';
  }

  let nameText = textWithoutEmail;
  if (matricMatch) {
    nameText = nameText.replace(matricMatch[0], '');
  } else {
    const rawMatric = textWithoutEmail.match(/(?:[0-9]{2}[A-Z]{1,2}[0-9oO]+[A-Z]*|ACU[0-9]{8}[A-Z]*)/i);
    if (rawMatric) {
      nameText = nameText.replace(rawMatric[0], '');
    }
  }

  nameText = nameText
    .replace(/\b(?:email|mail)\b\s*[:;]?/gi, '')
    .replace(/\b(?:matric\s*(?:number|no)?|no)\b/gi, '')
    .replace(/^\s*[.]*\s*\d+[\s.]*/, '')
    .replace(/^[.\s,;:]+/, '')
    .replace(/[.\s,;:]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();

  return { name: nameText, matric, email };
}

function findBestNameMatch(excelName, parsedStudentsOfLevel) {
  const excelWords = cleanName(excelName);
  if (excelWords.length === 0) return null;

  let bestMatch = null;
  let bestScore = 0;
  let runnerUpScore = 0;

  for (const student of parsedStudentsOfLevel) {
    const studentWords = cleanName(student.name);
    if (studentWords.length === 0) continue;

    const overlapWords = studentWords.filter(sw => 
      excelWords.some(ew => areWordsSimilar(sw, ew))
    );
    const overlap = overlapWords.length;

    if (overlap < 2) continue;

    const union = new Set([...excelWords, ...studentWords]).size;
    const score = overlap / union;

    if (score > bestScore) {
      runnerUpScore = bestScore;
      bestScore = score;
      bestMatch = student;
    } else if (score > runnerUpScore) {
      runnerUpScore = score;
    }
  }

  if (bestScore >= 0.4 && (bestScore - runnerUpScore) >= 0.15) {
    return bestMatch;
  }
  return null;
}

function mergeData() {
  const parts = rawText.split(/-- LEVEL \d+ --/);
  const levels = {
    "100": parseLevelText(parts[1] ?? ''),
    "200": parseLevelText(parts[2] ?? ''),
    "300": parseLevelText(parts[3] ?? ''),
    "400": parseLevelText(parts[4] ?? '')
  };

  const xlsxPath = path.join(process.cwd(), 'eligible_voters.xlsx');
  const workbook = XLSX.readFile(xlsxPath);

  const globallyMatchedStudents = new Set();
  const sheetMatches = {};

  // Phase 1: Identify all matches across all sheets first
  workbook.SheetNames.forEach(sheetName => {
    const parsedStudentsOfLevel = levels[sheetName];
    if (!parsedStudentsOfLevel) return;

    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    if (rows.length === 0) return;

    const unmatchedExcel = [];
    const matchedMap = new Map(); // rowIndex -> student

    // First Pass: Exact matric match (global check) and Jaccard name match
    // Note: Start at r = 0 because the original sheet has no header row
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      const excelMatric = String(row[0] ?? '').trim().toUpperCase();
      const excelName = String(row[1] ?? '').trim();
      if (!excelMatric && !excelName) continue;

      const normExcelMatric = normalizeMatric(excelMatric);

      let matched = null;
      // Matric match globally across levels. Ensure names share at least one similar word to prevent typo mismatches.
      Object.entries(levels).forEach(([lvl, list]) => {
        const found = list.find(s => s.matric && s.matric === normExcelMatric);
        if (found && namesShareWords(excelName, found.name)) {
          matched = found;
        }
      });

      if (!matched) {
        matched = findBestNameMatch(excelName, parsedStudentsOfLevel);
      }

      if (matched) {
        globallyMatchedStudents.add(matched);
        matchedMap.set(r, matched);
      } else {
        unmatchedExcel.push({ rowIndex: r, row, excelName, excelMatric });
      }
    }

    // Second Pass Heuristic: Unique surname matching in the same sheet
    const unmatchedParsed = parsedStudentsOfLevel.filter(s => !globallyMatchedStudents.has(s));
    const getSurnames = (list) => list.map(item => cleanName(item.name)[0]).filter(Boolean);
    const excelSurnames = getSurnames(unmatchedExcel.map(e => ({ name: e.excelName })));
    const parsedSurnames = getSurnames(unmatchedParsed);

    unmatchedExcel.forEach(e => {
      const eSurname = cleanName(e.excelName)[0];
      if (!eSurname) return;

      const countInExcel = excelSurnames.filter(s => s === eSurname).length;
      const countInParsed = parsedSurnames.filter(s => s === eSurname).length;

      if (countInExcel === 1 && countInParsed === 1) {
        const matched = unmatchedParsed.find(s => cleanName(s.name)[0] === eSurname);
        if (matched) {
          matchedMap.set(e.rowIndex, matched);
          globallyMatchedStudents.add(matched);
        }
      }
    });

    sheetMatches[sheetName] = {
      rows,
      matchedMap
    };
  });

  // Phase 2: Update sheets and append unmatched students
  workbook.SheetNames.forEach(sheetName => {
    const parsedStudentsOfLevel = levels[sheetName];
    if (!parsedStudentsOfLevel) return;

    const data = sheetMatches[sheetName];
    if (!data) return;

    const { rows, matchedMap } = data;

    // Build fresh rows array with prepended headers
    const newRows = [];
    if (sheetName === '100') {
      newRows.push(['Matric Number', 'Name', 'Alternative Matric Number', 'Email']);
    } else {
      newRows.push(['Matric Number', 'Name', 'Email']);
    }

    // Update existing rows
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      const excelMatric = String(row[0] ?? '').trim();
      const excelName = String(row[1] ?? '').trim();
      if (!excelMatric && !excelName) continue;

      const newRow = [excelMatric, excelName];
      if (matchedMap.has(r)) {
        const matched = matchedMap.get(r);
        if (sheetName === '100') {
          newRow[2] = matched.matric || '';
          newRow[3] = matched.email || '';
        } else {
          newRow[2] = matched.email || '';
        }
      } else {
        if (sheetName === '100') {
          newRow[2] = '';
          newRow[3] = '';
        } else {
          newRow[2] = '';
        }
      }
      newRows.push(newRow);
    }

    // Append completely unmatched students of this level to the end of this sheet
    // An unmatched student is one who was not matched in ANY sheet during Phase 1
    const unmatchedParsedFinal = parsedStudentsOfLevel.filter(s => !globallyMatchedStudents.has(s));
    unmatchedParsedFinal.forEach(s => {
      if (sheetName === '100') {
        newRows.push([ '', s.name, s.matric, s.email ]);
      } else {
        newRows.push([ s.matric, s.name, s.email ]);
      }
      console.log(`➕ APPENDED [Sheet ${sheetName}]: Name: "${s.name}", Matric: "${s.matric}", Email: "${s.email}"`);
    });

    // Save rows back to workbook sheet
    const newSheet = XLSX.utils.aoa_to_sheet(newRows);
    workbook.Sheets[sheetName] = newSheet;
  });

  // Write Excel file back
  XLSX.writeFile(workbook, xlsxPath);
  console.log(`\nSpreadsheet updated successfully at: ${xlsxPath}`);
}

mergeData();
