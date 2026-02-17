// src/lib/patient-templates.ts

export const PATIENT_TEMPLATES: Record<string, string> = {
  insomnia: `
## **Understanding your condition**
Difficulty sleeping is very common and often triggered by stress, routine changes, or caffeine. It is frustrating, but short-term insomnia usually improves within a few weeks by adjusting your habits, rather than taking sleeping pills which can stop working quickly.

## **Things that can help**
- **The 20-minute rule:** If you cannot sleep, do not lie there awake. Get up, go to a dim room, and read a boring book until you are sleepy.
- **Fix your wake-up time:** Get up at the exact same time every day to reset your body clock, even after a bad night.
- **Limit screens:** The light from phones and TVs wakes your brain up. Avoid them for 1 hour before bed.
- **Cut caffeine:** No tea, coffee, or energy drinks after 2pm.

## **Extra support**
- **Sleepio:** A digital NHS-accredited programme using Cognitive Behavioural Therapy (CBT) for insomnia.
- **NHS.uk:** Search "Sleep problems" for a full guide.

## **When to get help**
Contact your GP or 111 if:
- **You feel too tired to drive or operate machinery safely.**
- **You have sudden, severe confusion.**
- You have trouble sleeping for months despite trying these changes.
- You snore loudly and wake up gasping (signs of sleep apnoea).
`.trim(),

  "back pain": `
## **Understanding your condition**
Back pain is very common but rarely caused by serious damage. In most cases, it is a simple muscle or ligament strain. Your spine is strong and designed to move; resting in bed actually slows down recovery.

## **Things that can help**
- **Keep moving:** This is the most important step. Gentle walking and continuing normal activities as much as pain allows will speed up healing.
- **Heat:** Use a heat pack or hot water bottle (wrapped in a towel) for 15–20 minutes to reduce muscle spasm.
- **Pain relief:** Ibuprofen or paracetamol can help you stay active (check the label first).
- **Stay at work:** If possible, stay at work or return as soon as you can, even if you are not 100%.

## **Extra support**
- **Versus Arthritis:** Search for "Back pain exercises" on their website.
- **Self-Referral Physio:** Check if your local NHS trust allows you to book physio without a GP appointment.

## **When to get help**
**Call 999 or go to A&E immediately if:**
- **You have difficulty passing urine or controlling your bowels.**
- **You have numbness around your bottom or genitals.**
- **You have weakness in both legs.**
- Call your GP if the pain does not improve after 4–6 weeks.
`.trim(),

  cold: `
## **Understanding your condition**
Colds are caused by viruses that affect the nose and throat. Antibiotics do not kill viruses, so they will not help. Most people feel better in 7–10 days, although a cough can last up to 3 weeks.

## **Things that can help**
- **Rest and hydrate:** Drink plenty of water to replace fluids lost from fever or runny nose.
- **Soothe the throat:** Honey and lemon in warm water is effective for coughs (do not give honey to children under 1 year).
- **Pain relief:** Paracetamol or ibuprofen can lower fever and ease aches.
- **Clear the nose:** Saline nasal sprays or steam inhalation can help unblock a stuffy nose.

## **Extra support**
- **Local Pharmacy:** Pharmacists can suggest the best over-the-counter remedies for your specific symptoms.

## **When to get help**
Call 111 or your GP if:
- **You have difficulty breathing or severe chest pain.**
- **You are coughing up blood.**
- Symptoms last longer than 3 weeks or get suddenly worse after improving.
`.trim(),

  uti: `
## **Understanding your condition**
A UTI occurs when bacteria enter the bladder, causing stinging when you pee, a need to go often, or tummy pain. Mild infections often clear up quickly with antibiotics or self-care.

## **Things that can help**
- **Drink plenty of fluids:** Water helps flush the bacteria out of your bladder.
- **Pain relief:** Paracetamol can reduce pain and lower a high temperature.
- **Rest:** Give your body energy to fight the infection.
- **Avoid sex:** Wait until you feel completely better to avoid irritating the area further.

## **Extra support**
- **Pharmacy First:** You can often get antibiotics for a simple UTI directly from a local pharmacy without seeing a GP (women aged 16–64).

## **When to get help**
**Call 111 or your GP urgently if:**
- **You have a high fever, uncontrollable shivering, or pain in your sides/back (signs of kidney infection).**
- **You see blood in your urine.**
- Your symptoms do not improve after 2 days of antibiotics.
- You are male or pregnant (always requires a check).
`.trim(),

  reflux: `
## **Understanding your condition**
Acid reflux happens when stomach acid travels up towards the throat, causing a burning feeling or a sour taste. It is very common and usually caused by the muscle at the top of the stomach relaxing too much.

## **Things that can help**
- **Eat smaller meals:** Large meals expand the stomach and push acid up. Avoid eating 3 hours before bed.
- **Check your triggers:** Spicy food, caffeine, alcohol, fatty foods, and chocolate are common causes.
- **Sleep correctly:** Raise the head of your bed by 10-20cm using blocks.
- **Weight:** If you are overweight, losing even a small amount reduces pressure on your stomach.

## **Extra support**
- **NHS.uk:** Search "Heartburn and acid reflux" for dietary tips.

## **When to get help**
Contact your GP if:
- **Food feels like it is sticking in your throat when you swallow.**
- **You are vomiting blood or have black, tarry stools.**
- You are losing weight without trying.
- You have had symptoms for more than 3 weeks.
`.trim(),

  headache: `
## **Understanding your condition**
A tension headache feels like a tight band around your head. It is the most common type of headache and is often linked to stress, posture, or dehydration. It is rarely a sign of anything serious.

## **Things that can help**
- **Hydrate:** Drink plenty of water, as dehydration is a major trigger.
- **Take a break:** Step away from screens and stretch your neck and shoulders.
- **Pain relief:** Paracetamol or ibuprofen usually works well.
- **Relax:** Try deep breathing or a warm bath to loosen tense muscles.

## **Extra support**
- **NHS.uk:** Search "Headaches" to learn about triggers.

## **When to get help**
**Call 999 or go to A&E if:**
- **You have the sudden "worst headache of your life" (thunderclap).**
- **You have a stiff neck, high fever, and dislike bright lights.**
- **You have weakness, numbness, or speech problems.**
- Call your GP if you need painkillers more than 2 days a week.
`.trim(),

  anxiety: `
## **Understanding your condition**
Anxiety is a feeling of unease, worry, or fear. It is a normal reaction to stress, but it can become a problem if it is constant or stops you doing things. Physical symptoms like a racing heart or sweating are very common.

## **Things that can help**
- **Breathe:** Try "4-7-8 breathing". Inhale for 4 seconds, hold for 7, exhale for 8. This physically calms your nervous system.
- **Grounding:** Name 5 things you see, 4 you feel, 3 you hear, 2 you smell, and 1 you taste.
- **Limit triggers:** Caffeine and alcohol can mimic or trigger panic attacks.
- **Move:** Gentle exercise burns off stress hormones.

## **Extra support**
- **NHS Talking Therapies:** You can self-refer for CBT and counselling online without a GP letter.
- **Samaritans:** Call 116 123 for free, 24-hour listening support.

## **When to get help**
**Call 111 or your GP urgently if:**
- **You have thoughts of harming yourself.**
- **You feel unsafe.**
- Anxiety is stopping you from working or leaving the house.
`.trim(),

  depression: `
## **Understanding your condition**
Depression is more than just feeling unhappy or fed up for a few days. It is a persistent low mood, lack of energy, or loss of interest in things you used to enjoy, lasting weeks or months.

## **Things that can help**
- **Routine:** Try to get up, get dressed, and eat at normal times. Small wins matter.
- **Stay connected:** Talk to a friend or family member, even if you don't feel like it. Isolation makes it worse.
- **Exercise:** A 15-minute walk outside can naturally boost mood chemicals.
- **Limit Alcohol:** Alcohol is a depressant and will lower your mood further the next day.

## **Extra support**
- **NHS Talking Therapies:** Search online to self-refer for free psychological therapy.
- **Mind:** The mental health charity offers excellent online resources.

## **When to get help**
**Call 111 or your GP urgently if:**
- **You have thoughts of harming yourself or ending your life.**
- Your mood is stopping you from functioning (eating, working, washing).
- Symptoms have lasted more than 2 weeks without improvement.
`.trim(),

  constipation: `
## **Understanding your condition**
Constipation is when you do not pass stools as often as usual, or they are hard and difficult to pass. It is very common and usually caused by a lack of fibre, fluids, or movement.

## **Things that can help**
- **Boost fibre:** Eat more fruit (with skin), vegetables, and whole grains. Add them gradually to avoid bloating.
- **Hydrate:** Drink 6–8 glasses of water a day to soften the stool.
- **Move:** Daily walking helps stimulate the bowel muscles.
- **Routine:** Do not ignore the urge to go. Try to go at a regular time (e.g. after breakfast).

## **Extra support**
- **Your Pharmacy:** Laxatives can help get things moving in the short term. Ask your pharmacist which type is best for you.

## **When to get help**
Contact your GP if:
- **You have blood in your poo.**
- **You have severe tummy pain or vomiting.**
- You have been constipated for more than 2 weeks despite lifestyle changes.
- You are losing weight without trying.
`.trim(),

  gastroenteritis: `
## **Understanding your condition**
This is usually caused by a viral infection ("stomach bug"). It causes diarrhoea and vomiting. It can be unpleasant but usually clears up by itself within a week.

## **Things that can help**
- **Hydrate:** This is the most important rule. Sip small amounts of water or rehydration fluid often.
- **Hygiene:** Wash hands with soap and warm water frequently. Do not share towels.
- **Eat plain:** When you feel able, try plain foods like toast, rice, or pasta. Avoid spicy or fatty foods.
- **Stay home:** Do not go to work or school until 48 hours after the last episode of vomiting or diarrhoea.

## **Extra support**
- **Local Pharmacy:** Ask for oral rehydration sachets (like Dioralyte) to replace lost salts.

## **When to get help**
Call 111 or your GP if:
- **You have signs of dehydration (little pee, very dark pee, dizziness).**
- **There is blood in your diarrhoea or vomit.**
- **You have severe stomach pain.**
- Vomiting lasts more than 2 days or diarrhoea lasts more than 7 days.
`.trim(),

  eczema: `
## **Understanding your condition**
Eczema is a condition where the skin barrier is dry and sensitive. A "flare-up" is when the skin becomes red, itchy, and inflamed. This is often triggered by stress, weather changes, or soaps.

## **Things that can help**
- **Moisturise heavily:** Apply your emollient cream generously and frequently. This is the main treatment.
- **Soap substitute:** Do not use normal soap or bubble bath. Wash with your emollient instead.
- **Stop the itch:** Tap or pinch the skin instead of scratching, which damages the barrier.
- **Steroids:** If prescribed steroid cream, apply it thinly *only* to the red, itchy patches once a day.

## **Extra support**
- **National Eczema Society:** Provides excellent fact sheets.
- **NHS.uk:** Watch the video "How to apply emollients" to ensure you are using enough.

## **When to get help**
Contact your GP if:
- **The skin becomes weepy, crusted with yellow fluid, or very painful (signs of infection).**
- **The rash spreads rapidly.**
- The eczema is affecting your sleep or daily life significantly.
`.trim(),

  asthma: `
## **Understanding your condition**
Asthma causes the airways to narrow, leading to coughing, wheezing, and breathlessness. A mild worsening means you have more symptoms than usual but can still speak in full sentences and catch your breath.

## **Things that can help**
- **Use your reliever:** Take your blue inhaler as directed (usually 2 puffs). Use a spacer if you have one.
- **Check technique:** Ensure you are using your inhaler correctly.
- **Avoid triggers:** Stay away from smoke, dust, pets, or cold air if they trigger you.
- **Sit upright:** This helps open your lungs. Do not lie flat.

## **Extra support**
- **Asthma + Lung UK:** Excellent videos on inhaler technique and action plans.

## **When to get help**
**Call 999 or go to A&E immediately if:**
- **You are struggling to breathe or speak in full sentences.**
- **Your reliever inhaler is not helping.**
- **Your lips or fingernails are turning blue.**
- Call your GP for an urgent appointment if you need your reliever inhaler every day.
`.trim(),

  hypertension: `
## **Understanding your condition**
High blood pressure (hypertension) puts extra strain on your blood vessels and heart. It rarely has symptoms but increases the risk of heart attacks and strokes. Lifestyle changes can significantly lower your reading.

## **Things that can help**
- **Reduce salt:** Do not add salt at the table and check labels on processed foods. Aim for less than 6g a day.
- **Move more:** Aim for 150 minutes of moderate activity (brisk walking) a week.
- **Lose weight:** If you are overweight, losing even a few kilos makes a big difference.
- **Limit alcohol:** Keep to under 14 units a week and have alcohol-free days.

## **Extra support**
- **Blood Pressure UK:** Detailed advice on lowering your numbers naturally.

## **When to get help**
**Call 999 if:**
- **You have severe chest pain.**
- **You have symptoms of a stroke (face dropping, arm weakness, speech difficulty).**
- See your GP if your home blood pressure readings are persistently high (above 135/85).
`.trim(),

  diabetes: `
## **Understanding your condition**
Type 2 diabetes means your blood sugar is too high because your insulin is not working effectively. Over time, high sugar can damage eyes, kidneys, and nerves. Diet and exercise are powerful treatments.

## **Things that can help**
- **Carbohydrates:** Reduce sugar and white carbs (bread, pasta). Swap for wholegrains and vegetables.
- **Activity:** Exercise helps your insulin work better. Try a 20-minute walk after meals.
- **Weight:** Losing weight, especially around the tummy, can sometimes put diabetes into remission.
- **Check feet:** Check your feet daily for cuts or blisters and see a podiatrist if they don't heal.

## **Extra support**
- **Diabetes UK:** Offers recipes, forums, and expert guides.

## **When to get help**
**Call 999 if:**
- **You have very high blood sugar with vomiting, drowsiness, or confusion.**
- Contact your GP if you have frequent thirst, excessive peeing, or blurred vision.
`.trim(),

  menopause: `
## **Understanding your condition**
Menopause is when your periods stop due to lower hormone levels. Perimenopause is the time leading up to this. Symptoms include hot flushes, mood changes, brain fog, and poor sleep. It is a natural stage of life, not an illness.

## **Things that can help**
- **Hot flushes:** Dress in layers, keep the room cool, and limit caffeine/alcohol.
- **Bones:** Weight-bearing exercise (walking, dancing) keeps bones strong as estrogen drops.
- **Mood:** Prioritise sleep and relaxation. Talk to others going through the same thing.
- **HRT:** Hormone Replacement Therapy is safe and effective for many women. Discuss it with your GP.

## **Extra support**
- **The Menopause Charity / NHS.uk:** Reliable, evidence-based information on HRT and natural remedies.

## **When to get help**
Contact your GP if:
- **You have bleeding after menopause (more than 12 months after your last period). This must always be checked.**
- Symptoms are affecting your ability to work or enjoy life.
`.trim(),

  shoulder: `
## **Understanding your condition**
Shoulder pain is common and usually caused by inflammation of the tendons (rotator cuff) or stiffness. It is rarely serious and usually improves over several weeks with gentle movement.

## **Things that can help**
- **Keep moving:** Do not keep the arm completely still (unless broken). Gentle movement stops it seizing up.
- **Pendulum exercise:** Lean forward, let your arm hang loose, and swing it gently in small circles.
- **Pain relief:** Paracetamol or ibuprofen can help you sleep and move better.
- **Posture:** Avoid hunching over screens, which strains the shoulders.

## **Extra support**
- **NHS.uk:** Search "Shoulder pain" for diagrams of exercises.

## **When to get help**
**Go to A&E if:**
- **The shoulder looks deformed (out of shape) after a fall.**
- **You have sudden, severe shoulder pain along with chest pain or breathlessness.**
- See your GP if the pain stops you lifting your arm or lasts more than 4 weeks.
`.trim(),

  knee: `
## **Understanding your condition**
Osteoarthritis is where the protective cartilage in the knee thins, causing pain and stiffness. It is common as we age. It does *not* mean the knee is "crumbling"; joints can stay strong and functional with the right care.

## **Things that can help**
- **Exercise:** This is the best treatment. Strong thigh muscles support the knee. Try seated leg raises.
- **Weight:** Losing weight reduces the load on your knees significantly.
- **Shoes:** Wear cushioned, supportive shoes. Avoid high heels.
- **Pacing:** Break up heavy tasks. Sit down to chop vegetables or iron.

## **Extra support**
- **Versus Arthritis:** "Let's Move with Leon" is a free online exercise class for people with arthritis.

## **When to get help**
**Go to A&E if:**
- **The knee is hot, red, and swollen, and you feel feverish (sign of infection).**
- **You cannot put any weight on the leg after an injury.**
- See your GP if the knee locks or gives way frequently.
`.trim(),

  "hay fever": `
## **Understanding your condition**
Hay fever is an allergic reaction to pollen. It causes sneezing, itchy eyes, and a runny nose. It is common in spring and summer. It cannot be cured, but symptoms can be controlled.

## **Things that can help**
- **Barriers:** Put Vaseline around your nostrils to trap pollen. Wear wraparound sunglasses.
- **Avoid pollen:** Keep windows closed in the early morning and evening when pollen counts are high.
- **Hygiene:** Shower and change clothes after being outside to wash pollen off.
- **Treatment:** Antihistamine tablets and steroid nasal sprays are the most effective treatments (available at pharmacies).

## **Extra support**
- **Met Office:** Check the daily pollen forecast on their app or website.

## **When to get help**
Contact your GP if:
- **You are wheezing or finding it hard to breathe (this may be asthma).**
- Pharmacy treatments are not working after 2–4 weeks of regular use.
`.trim(),

  smoking: `
## **Understanding your condition**
Smoking is an addiction to nicotine, not just a habit. It damages nearly every organ in the body. The good news is that your body begins to repair itself as soon as you stop, no matter how long you have smoked.

## **Things that can help**
- **Set a date:** Pick a "Quit Date" within the next 2 weeks and stick to it.
- **NRT:** Patches, gum, and sprays double your chances of quitting. Using a patch + a fast-acting product (like spray) is best.
- **Triggers:** Identify when you smoke (e.g., with coffee). Change the routine (drink tea, go for a walk).
- **Support:** You are 3x more likely to quit with professional support than willpower alone.

## **Extra support**
- **NHS Stop Smoking Service:** Free local support and prescription treatments.
- **Smoke Free App:** An NHS app to track your progress and savings.

## **When to get help**
* See your GP or practice nurse to discuss prescription medication (like Varenicline) if NRT hasn't worked.
* **Urgent:** If you cough up blood or have persistent chest pain, see a doctor immediately.
`.trim(),

  weight: `
## **Understanding your condition**
Carrying extra weight increases the risk of diabetes, heart disease, and joint pain. Weight loss is not about "diets" or starvation; it is about finding a healthy way of eating that you can stick to long-term.

## **Things that can help**
- **Be realistic:** Aim to lose 0.5kg to 1kg (1-2lbs) a week. Slow weight loss stays off.
- **Portions:** Use a smaller plate. Fill half the plate with vegetables first.
- **Snacks:** Swap biscuits and crisps for fruit, nuts, or yoghurt.
- **Activity:** Any movement counts. Walking, gardening, or dancing all burn calories.

## **Extra support**
- **NHS Weight Loss Plan:** A free 12-week app guide.
- **Local Groups:** Ask your GP about referral to local weight management groups (e.g. Slimming World or NHS Digital programmes).

## **When to get help**
Contact your GP if:
- You have a BMI over 30 and are struggling to lose weight alone.
- You have other health conditions like diabetes or high blood pressure.
- **Urgent:** You have sudden, severe breathlessness or chest pain when exercising.
`.trim()
};