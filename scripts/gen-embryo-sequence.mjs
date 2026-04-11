import fs from 'fs';
import { loadEnv } from '../../lib/env.mjs';
import { GoogleGenAI } from '@google/genai';
import { uploadToAssets } from '../../lib/r2.mjs';

const env = loadEnv();
const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

const stages = [
  {
    title: "Stage 1: Primitive Streak Formation",
    day: "Day 15",
    description: "The primitive streak appears as a midline thickening at the caudal end of the bilaminar embryonic disc. Epiblast cells undergo ingression through the primitive groove to form intraembryonic mesoderm. The primitive node (Hensen's node) at the cranial end directs subsequent axial development.",
    prompt: "Clean medical vector illustration, white background, 4:3 landscape. Dorsal view of flat bilaminar embryonic disc at Day 15. Show oval disc with primitive streak as midline thickening from caudal end. Label: primitive streak, primitive groove, primitive node (Hensen's node), primitive pit, epiblast (blue), hypoblast (yellow). Red arrows showing epiblast cells ingressing as mesoderm (red). Small inset cross-section at bottom-right showing three layers: epiblast (blue) top, mesoderm (red) middle spreading laterally, hypoblast (yellow) below. Label cranial and caudal poles. Educational diagram, clean lines, flat colors."
  },
  {
    title: "Stage 2: Notochord Formation",
    day: "Day 16-17",
    description: "Cells from the primitive node migrate cranially as the notochordal process, forming the solid notochord that defines the embryonic axis, induces the neural plate, and persists as the nucleus pulposus in adults.",
    prompt: "Clean medical vector illustration, white background, 4:3 landscape. Dorsal view of embryonic disc at Day 16-17. Show primitive streak at caudal end and notochordal process extending cranially from primitive node as solid dark red midline rod. Label: notochordal process, primitive node, primitive streak, oropharyngeal membrane (cranial), cloacal membrane (caudal), prechordal plate. Ectoderm surface light blue. Sagittal cross-section inset at bottom-right showing: ectoderm (blue) top, notochord (dark red rod) in midline, mesoderm (red) lateral, endoderm (yellow) below. Educational diagram, flat colors, clean vector lines."
  },
  {
    title: "Stage 3: Neural Plate and Neural Groove",
    day: "Day 18-20",
    description: "The notochord induces overlying ectoderm to thicken into the neural plate. Lateral edges elevate as neural folds with a central neural groove. Neural crest cells differentiate at the junction. Folic acid deficiency during this period can cause neural tube defects.",
    prompt: "Clean medical vector illustration, white background, 4:3 landscape. Two panels side by side. LEFT: Dorsal view at Day 18-20 showing neural plate (darker blue shoe-sole shape) with neural groove (midline depression) and elevated neural folds. Label: neural plate, neural groove, neural fold, primitive streak (smaller, regressing), early somites (red blocks) at cranial end. RIGHT: Transverse cross-section showing: surface ectoderm (light blue), neural folds (darker blue) elevated, neural groove (center depression), neural crest cells (purple dots) at junction, notochord (dark red circle) below, paraxial mesoderm (red), lateral plate mesoderm, endoderm (yellow) at bottom. Label all structures. Flat educational colors."
  },
  {
    title: "Stage 4: Neural Tube Closure and Somites",
    day: "Day 21-25",
    description: "Neural folds fuse beginning at the cervical region, proceeding bidirectionally. Anterior neuropore closes by Day 25, posterior by Day 27. Failure causes anencephaly or spina bifida. Paraxial mesoderm segments into 25+ somite pairs that form vertebrae, muscles, and dermis.",
    prompt: "Clean medical vector illustration, white background, 4:3 landscape. Two panels. LEFT: Dorsal view at Day 22-25 showing neural tube (dark blue, closed in middle) with anterior neuropore open at cranial end and posterior neuropore open at caudal end. Show 20+ paired somites (red blocks) flanking neural tube. Arrows showing closure direction from cervical region. RIGHT: Transverse cross-section showing: surface ectoderm (light blue), closed neural tube (dark blue circle) with neural canal lumen, neural crest cells (purple) migrating away, notochord (dark red) ventral, somites (red, showing dermatome/myotome/sclerotome), intraembryonic coelom between somatic and splanchnic mesoderm, endoderm (yellow) ventrally. Label all structures clearly."
  },
  {
    title: "Stage 5: Embryo Folding Complete",
    day: "Day 26-28",
    description: "Lateral, head, and tail folding converts the flat disc into a C-shaped embryo. Endoderm forms the primitive gut (foregut, midgut, hindgut) connected to yolk sac. All three germ layers are established. Abnormal primitive streak regression causes sacrococcygeal teratomas.",
    prompt: "Clean medical vector illustration, white background, 4:3 landscape. Sagittal view of C-shaped embryo at Day 26-28 after folding. Show curved embryo with head fold and tail fold. Label: brain vesicles (blue bulges at cranial end), pharyngeal arches (4 arches), heart bulge (red, ventral), somites (red segments along dorsal surface, ~30 pairs), neural tube (dark blue along dorsal length), foregut (yellow tube, cranial), midgut (yellow, connecting to yolk sac), hindgut (yellow tube, caudal), vitelline duct, yolk sac (yellow balloon below), connecting stalk, allantois, amnion. Color coding: ectoderm=blue, mesoderm=red, endoderm=yellow. Small legend box bottom-left with germ layer colors. Educational vector diagram, flat colors."
  }
];

async function generateImage(prompt, index) {
  console.log(`  Generating image ${index + 1}/5...`);
  const r = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: prompt,
    config: { responseModalities: ['TEXT', 'IMAGE'] },
  });
  const img = r.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
  if (!img) {
    const text = r.candidates?.[0]?.content?.parts?.map(p => p.text).join(' ');
    console.log(`  FAIL: No image. Model said: ${text?.substring(0, 100)}`);
    return null;
  }
  const buf = Buffer.from(img.inlineData.data, 'base64');
  console.log(`  OK: ${Math.round(buf.length / 1024)}KB`);
  return buf;
}

async function main() {
  console.log('Generating 5 embryology sequence images...\n');

  const results = [];
  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i];
    console.log(`[${i + 1}/5] ${stage.title} (${stage.day})`);

    const buf = await generateImage(stage.prompt, i);
    if (!buf) { console.log('  SKIPPING'); continue; }

    // Save locally
    const slug = `h5p-embryo-sequence-stage-${i + 1}`;
    fs.writeFileSync(`/tmp/${slug}.png`, buf);

    // Upload to R2
    const r2Key = `h5p/image-sequencing/embryology-3rd-8th-week/${slug}.png`;
    console.log(`  Uploading to R2: ${r2Key}`);
    const url = await uploadToAssets(env, buf, r2Key, 'image/png');
    console.log(`  URL: ${url}`);

    results.push({
      ...stage,
      imageUrl: url,
      localPath: `/tmp/${slug}.png`,
    });
  }

  // Write results
  fs.writeFileSync('/tmp/embryo-sequence-results.json', JSON.stringify(results, null, 2));
  console.log(`\nDone: ${results.length}/5 images generated`);
  console.log('Results: /tmp/embryo-sequence-results.json');
}

main().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
