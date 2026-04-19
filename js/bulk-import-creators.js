// Bulk Import Script for TABOOST Creator Roster
// Run this in Cloud Shell or browser console with Firebase Admin SDK

const creators = [
  {"cid": "7359135084659736581", "username": "samanthasingsit", "manager": "carrington"},
  {"cid": "7359135097779519493", "username": "bryton.39", "manager": "marco"},
  {"cid": "7359135105165656069", "username": "freekbass", "manager": "carrington"},
  {"cid": "7359135264167428102", "username": "coloreomusic", "manager": "carrington"},
  {"cid": "7359134585688522757", "username": "singleonthemove", "manager": "carrington"},
  {"cid": "7527933905626988561", "username": "shanellenikolee", "manager": "carrington"},
  {"cid": "7359134572702957574", "username": "jayden_egg", "manager": "carrington"},
  {"cid": "7368626525710794769", "username": "daisy_dew4", "manager": "carrington"},
  {"cid": "7359135727810052101", "username": "hotterjakepaul", "manager": "carrington"},
  {"cid": "7359134909191159814", "username": "skylerclarkk", "manager": "carrington", "claimed": true},
  {"cid": "7359134960558571525", "username": "smity194", "manager": "carrington"},
  {"cid": "7513787055730638849", "username": "cwdetroit", "manager": "carrington"},
  {"cid": "7359135814745391109", "username": "tha_dripp_phamily", "manager": "carrington"},
  {"cid": "7417960855335354369", "username": "pcdrums76", "manager": "carrington"},
  {"cid": "7359136208586637317", "username": "thebellaflora__", "manager": "carrington"},
  {"cid": "7391438796933546001", "username": "mirsowavy", "manager": "carrington"},
  {"cid": "7576723590549389326", "username": "gaywhonotme", "manager": "sven"},
  {"cid": "7359136272692117509", "username": "koryskitchen", "manager": "carrington"},
  {"cid": "7359136287120719877", "username": "redrumstudios", "manager": "bryton"},
  {"cid": "7409743090665242641", "username": "theviolution", "manager": "carrington"},
  {"cid": "7433607263870517264", "username": "alexaraeemusic", "manager": "carrington"},
  {"cid": "7359135283092226053", "username": "oregonstargirl", "manager": "carrington"},
  {"cid": "7359135407352610822", "username": "burnt.tatertot", "manager": "carrington"},
  {"cid": "7359137631822708741", "username": "sam_g_89", "manager": "bryton"},
  {"cid": "7497777597393190929", "username": "stefanielauryn415", "manager": "carrington"},
  {"cid": "7359135268521246726", "username": "thetrapviolinist", "manager": "carrington"},
  {"cid": "7558760842850746382", "username": "sarahegant", "manager": "carrington"},
  {"cid": "7451090481020321808", "username": "growandglowasmr", "manager": "bryton"},
  {"cid": "7581605738645078071", "username": "jordan.borges", "manager": "dylan"},
  {"cid": "7554552006812188727", "username": "imjustnicob", "manager": "bryton"},
  {"cid": "7359135408745447429", "username": "b.herbz", "manager": "carrington"},
  {"cid": "7387268256991657985", "username": "titancosplays", "manager": "carrington"},
  {"cid": "7359138280010645509", "username": "ageofangel", "manager": "carrington"},
  {"cid": "7359135698651217926", "username": "mystiquedejello", "manager": "carrington"},
  {"cid": "7595776572192243726", "username": "muthafknsid", "manager": "bryton"},
  {"cid": "7359134875733000198", "username": "maiazakay", "manager": "marco"},
  {"cid": "7359134984718024709", "username": "cpayne_04", "manager": "carrington"},
  {"cid": "7359135322615185413", "username": "aaronhunt30575", "manager": "carrington"},
  {"cid": "7359136363951816710", "username": "rockylanemusic", "manager": "carrington"},
  {"cid": "7359134961959632902", "username": "thecyrilia", "manager": "carrington"},
  {"cid": "7359134527924666373", "username": "basswizrd", "manager": "carrington"},
  {"cid": "7359134698641293317", "username": "bobbyjwil", "manager": "carrington"},
  {"cid": "7608338554233602062", "username": "deearnnap", "manager": "levi"},
  {"cid": "7359134981857280006", "username": "averynoelles", "manager": "carrington"},
  {"cid": "7601674566645202999", "username": "threehundredseventytwo", "manager": "levi"},
  {"cid": "7359134813120659461", "username": "jeremiahboutross", "manager": "carrington"},
  {"cid": "7517471096153718800", "username": "imamberleybriana", "manager": "sven"},
  {"cid": "7359134456151867397", "username": "luke.h.reynoldsmusic", "manager": "carrington"},
  {"cid": "7359137668212490245", "username": "sebbythecatdad", "manager": "levi"}
];

// Function to import creators to Firestore
async function importCreatorsToFirestore(db) {
  const batch = db.batch();
  let count = 0;
  
  for (const creator of creators) {
    const docRef = db.collection('creatorRoster').doc(creator.username.toLowerCase());
    
    // Check if already exists
    const doc = await docRef.get();
    if (!doc.exists) {
      batch.set(docRef, {
        cid: creator.cid,
        tiktokUsername: creator.username.toLowerCase(),
        claimed: creator.claimed || false,
        manager: creator.manager.toUpperCase(),
        importedAt: new Date()
      });
      count++;
      console.log(`✅ Queued: ${creator.username}`);
    } else {
      console.log(`⏭️  Skipped (exists): ${creator.username}`);
    }
  }
  
  if (count > 0) {
    await batch.commit();
    console.log(`\n🎉 Successfully imported ${count} creators!`);
  } else {
    console.log('\nℹ️ All creators already exist in roster');
  }
}

// Instructions:
// 1. Go to Firebase Console → Firestore Database
// 2. Open browser console (F12)
// 3. Run the code below to get db reference:
//    const db = firebase.firestore();
// 4. Then run: importCreatorsToFirestore(db)

export { creators, importCreatorsToFirestore };
