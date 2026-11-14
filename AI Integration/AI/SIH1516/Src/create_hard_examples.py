from pathlib import Path
import pandas as pd
import random

random.seed(42)

BASE_DIR = Path(__file__).resolve().parent.parent
OUTPUT = BASE_DIR / "data" / "processed" / "hard_examples.csv"

OUTPUT.parent.mkdir(parents=True, exist_ok=True)

examples = {
    "Pothole": [
        "road pe bada gadda hai",
        "deep hole in middle of road",
        "school ke bahar road me gadda hai",
        "bike wale pothole ki wajah se gir rahe hain",
        "dangerous pit on main road",
        "road ke beech huge pothole",
    ],

    "Damaged Road": [
        "road pura toot gaya hai",
        "street surface is completely broken",
        "sadak ki halat bahut kharab hai",
        "road surface cracked everywhere",
        "main road ka asphalt nikal gaya",
        "the entire road needs repair",
    ],

    "Damaged Footpath": [
        "footpath tiles are broken",
        "paidal chalne ka rasta toot gaya hai",
        "broken pavement near market",
        "footpath pe slabs toot gaye",
        "sidewalk is damaged badly",
        "pedestrian path unsafe hai",
    ],

    "Road Obstruction": [
        "construction material blocking road",
        "road pe malba pada hai",
        "debris blocking vehicles",
        "sadak par saman rakh ke rasta block kiya hai",
        "large object blocking the street",
        "road is blocked by construction debris",
    ],

    "No Water Supply": [
        "3 din se pani nhi aa rha",
        "no water since yesterday",
        "hamare area me water supply band hai",
        "taps are completely dry",
        "do din se nal me pani nahi hai",
        "water supply stopped in colony",
    ],

    "Water Leakage": [
        "pipeline se pani leak ho raha hai",
        "water pipe burst on road",
        "main water line is leaking",
        "road pe pipe se pani bah raha hai",
        "broken pipeline wasting water",
        "water leakage near my house",
    ],

    "Low Water Pressure": [
        "nal me pani bohot slow aa raha hai",
        "very low water pressure",
        "upper floor tak pani nahi aa raha",
        "tap pressure is extremely weak",
        "pani ka pressure bahut kam hai",
        "barely any water coming from tap",
    ],

    "Contaminated Water": [
        "tap se black water aa raha hai",
        "dirty water coming from taps",
        "pani me bad smell aa rahi hai",
        "brown drinking water supplied",
        "nal ka pani ganda hai",
        "water looks contaminated",
    ],

    "Blocked Drain": [
        "gutter jam ho gaya hai",
        "drain completely clogged",
        "nali me pani flow nahi ho raha",
        "garbage has blocked the drain",
        "drain choke ho gaya",
        "blocked gutter near house",
    ],

    "Sewage Overflow": [
        "gutter ka ganda pani road pe aa raha hai",
        "sewage flowing on street",
        "manhole se dirty water nikal raha",
        "sewer overflowing outside house",
        "ganda sewer water road pe hai",
        "sewage coming out of manhole",
    ],

    "Open/Broken Drain": [
        "open drain outside school",
        "nali ka cover missing hai",
        "broken gutter is dangerous",
        "khuli nali road ke side me hai",
        "drain slab has broken",
        "uncovered drain near footpath",
    ],

    "Waterlogging": [
        "road pe baarish ka pani jama hai",
        "street completely flooded",
        "colony me waterlogging hai",
        "rain water not draining",
        "sadak pani me dubi hui hai",
        "standing water all over road",
    ],

    "Garbage Not Collected": [
        "3 din se garbage nahi uthaya",
        "trash collection has stopped",
        "kachra gadi nahi aa rahi",
        "waste lying uncollected",
        "garbage collector did not come",
        "ghar ka kachra kai din se pada hai",
    ],

    "Overflowing Garbage Bin": [
        "dustbin pura bhar gaya hai",
        "garbage coming out of bin",
        "kachra dabba overflow ho raha",
        "public bin is completely full",
        "trash spilling onto road",
        "bin urgently needs emptying",
    ],

    "Illegal Garbage Dumping": [
        "people dumping garbage on empty plot",
        "roadside pe illegally kachra feka ja raha",
        "someone dumped construction waste here",
        "public place being used as dump",
        "raat me yaha kachra fek dete hain",
        "illegal waste dumping near river",
    ],

    "Dead Animal": [
        "dead dog lying on road",
        "roadside pe mara hua janwar hai",
        "dead cow needs removal",
        "animal body causing bad smell",
        "mara hua kutta market ke paas pada hai",
        "animal carcass on street",
    ],

    "Streetlight Not Working": [
        "whole street is dark every night",
        "street light band hai",
        "lamp post light not turning on",
        "raat ko colony me light nahi jalti",
        "streetlight fused near bus stop",
        "all public lights are off",
    ],

    "Damaged Streetlight Pole": [
        "street light pole is leaning",
        "light ka khamba toot gaya",
        "lamp post damaged after accident",
        "pole road ki taraf jhuk gaya hai",
        "streetlight pole may fall",
        "broken lighting pole near school",
    ],

    "Exposed Electrical Wire": [
        "live electric wire fallen on road",
        "person injured by exposed electric wire",
        "school ke bahar electric wire latak rahi hai",
        "bijli ka taar road pe gir gaya hai",
        "current wala wire niche pada hai",
        "dangerous live cable exposed",
        "electric cable is hanging from pole",
        "open electrical wires near footpath",
        "wire me current hai aur road pe pada hai",
        "live wire hanging dangerously low",
    ],

    "Fallen Tree": [
        "tree fell across the road",
        "ped road pe gir gaya hai",
        "storm me tree road par gir gaya",
        "fallen tree blocking vehicles",
        "bada tree street ke beech gira hai",
        "tree collapsed near market",
    ],

    "Dangerous Tree": [
        "tree looks like it may fall",
        "ped bahut dangerous tarike se jhuk gaya",
        "large branch may fall",
        "weak tree near school",
        "dead tree can collapse anytime",
        "dangerous hanging tree branch",
    ],

    "Damaged Park": [
        "park equipment is broken",
        "park ki benches toot gayi hain",
        "children play area damaged",
        "park gate is broken",
        "public park equipment damaged",
        "playground structure toot gaya",
    ],

    "Park Maintenance": [
        "park needs cleaning",
        "garden ki safai nahi hui",
        "grass in park is overgrown",
        "public garden needs maintenance",
        "park bahut dirty hai",
        "garden has not been maintained",
    ],

    "Traffic Signal Not Working": [
        "traffic signal band hai",
        "red light is not working",
        "signal at junction stopped functioning",
        "traffic lights completely dead",
        "chowk ka signal kharab hai",
        "traffic signal not changing",
    ],

    "Damaged Traffic Sign": [
        "traffic sign board broken",
        "road sign gir gaya hai",
        "speed limit board damaged",
        "traffic sign is unreadable",
        "direction board toot gaya",
        "damaged road sign near junction",
    ],

    "Road Marking Issue": [
        "zebra crossing faded",
        "road markings are invisible",
        "lane lines mit gayi hain",
        "road paint needs repainting",
        "crosswalk markings disappeared",
        "sadak ki white lines nahi dikh rahi",
    ],

    "Traffic Obstruction": [
        "vehicle blocking traffic",
        "truck road ke beech khada hai",
        "traffic blocked by illegally parked vehicle",
        "car is obstructing the lane",
        "road pe vehicle se jam lag raha",
        "vehicle causing major traffic obstruction",
    ],

    "Illegal Encroachment": [
        "shop has occupied the footpath",
        "public road pe illegal kabza hai",
        "footpath encroached by vendor",
        "someone occupied government land",
        "public space illegally occupied",
        "sadak ka hissa kabza kar liya hai",
    ],

    "Illegal Construction": [
        "unauthorized building construction",
        "bina permission construction chal raha",
        "illegal structure being built",
        "construction without municipal approval",
        "illegal building work in colony",
        "permission ke bina building ban rahi hai",
    ],

    "Damaged Public Property": [
        "public bench has been broken",
        "government property damaged",
        "bus stop shelter toot gaya",
        "public infrastructure vandalized",
        "municipal property is damaged",
        "public facility broken badly",
    ],

    "Unauthorized Hoarding": [
        "illegal billboard installed",
        "bina permission hoarding laga hai",
        "unauthorized advertisement board",
        "huge illegal banner on road",
        "public pole pe illegal hoarding hai",
        "billboard installed without permission",
    ],
}


rows = []

for subcategory, texts in examples.items():
    for text in texts:
        rows.append({
            "complaint_text": text,
            "subcategory": subcategory
        })

df = pd.DataFrame(rows)

df.to_csv(
    OUTPUT,
    index=False,
    encoding="utf-8-sig"
)

print(f"Created {len(df)} hard examples.")
print(f"Saved to: {OUTPUT}")