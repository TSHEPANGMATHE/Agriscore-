// Fictional demo data. Records are shaped so each farmer's history matches their outcome (Strong / Limited / Not Eligible).
// Fictional demo data. Every generated record carries its own clientId.
const clients = [
  {id:"AGR001", name:"Lerato Mokoena", business:"Mokoena Family Farm", location:"Tzaneen, Limpopo", farmType:"Mixed crops", profileType:"Established Grower", email:"lerato@demo.agr", password:"farmer123", weatherRisk:27, area:12.5, crops:["Maize","Beans","Vegetables"]},
  {id:"AGR002", name:"Thabo Nkosi", business:"Nkosi Grain Farm", location:"Giyani, Limpopo", farmType:"Grain production", profileType:"New / Thin Credit File", email:"thabo@demo.agr", password:"farmer123", weatherRisk:45, area:8.2, crops:["Maize","Sunflower","Soybeans"]},
  {id:"AGR003", name:"Nomsa Baloyi", business:"Baloyi Produce Co-op", location:"Mopani, Limpopo", farmType:"Small-scale mixed farming", profileType:"New / Thin Credit File", email:"nomsa@demo.agr", password:"farmer123", weatherRisk:50, area:5.7, crops:["Vegetables","Beans","Maize"]}
];
const mobileTransactions = [];
const cooperativeRepayments = [];
const harvestRecords = [];
const categories = ["Produce sales","Seed purchases","Fertiliser","Transport","Equipment","Supplier payment","Customer payment","Cooperative payment"];
const cropYields = {Maize:3200, Beans:850, Vegetables:2100, Sunflower:1450, Soybeans:1800};
const money = n => Math.round(n*100)/100;
clients.forEach((c, ci) => {
  const N = [20,12,8][ci]; // Lerato has a deep file; Thabo and Nomsa have thinner, newer files
  for (let i=1; i<=N; i++) {
    const incoming = (i % 3 !== 0);
    const amount = money(incoming ? [1000,300,350][ci] + i*[160,200,150][ci] : 260 + ci*95 + i*43);
    mobileTransactions.push({
      id:`${c.id}-TX${String(i).padStart(3,"0")}`, clientId:c.id,
      date:`2026-${String(((i+ci*2-1)%9)+1).padStart(2,"0")}-${String(((i*3+ci*4-1)%27)+1).padStart(2,"0")}`,
      direction:incoming?"Incoming":"Outgoing", category:incoming?["Produce sales","Customer payment","Produce sales"][i%3]:categories[(i+ci)%5+1],
      description:incoming?`${c.crops[i%c.crops.length]} sales payment`:`Farm ${categories[(i+ci)%5+1].toLowerCase()}`,
      amount, status:"Completed", reference:`MM-${c.id}-${1000+i}`
    });
    const scheduledDay = ((i*2+ci)%25)+1;
    const late = ci===0 ? (i%10===0) : ci===1 ? (i%4===0) : (i%2===0);
    const missed = ci===0 ? false : ci===1 ? (i%9===0) : (i%3===0);
    const scheduled = `2026-${String(((i+ci-1)%9)+1).padStart(2,"0")}-${String(scheduledDay).padStart(2,"0")}`;
    const actual = missed ? "" : `2026-${String(((i+ci-1)%9)+1).padStart(2,"0")}-${String(Math.min(28,scheduledDay+(late?4:0))).padStart(2,"0")}`;
    const due = money(450+ci*125+i*28);
    const paid = missed ? money(due*0.25) : due;
    cooperativeRepayments.push({
      id:`${c.id}-RP${String(i).padStart(3,"0")}`, clientId:c.id, cooperative:["Mopani Growers Co-op","Limpopo Farmers Union","Green Harvest Co-op"][ci],
      loanRef:`LN-${c.id}-${2025+(i%2)}`, purpose:["Seeds","Irrigation","Fertiliser","Equipment"][i%4],
      originalLoan:money(9000+ci*3500+(i%4)*1250), scheduledDate:scheduled, actualDate:actual,
      scheduledAmount:due, paidAmount:paid, status:missed?"Outstanding":late?"Late":"On time",
      daysLate:late?4:0, outstanding:money(due-paid)
    });
    const crop = c.crops[(i+ci)%c.crops.length];
    const area = money(Math.max(0.2,c.area/(2+(i%4))));
    const qty = money(cropYields[crop]*(area/1.0)*(0.72+((i+ci)%6)*0.07)*[1.15,0.75,0.6][ci]);
    harvestRecords.push({
      id:`${c.id}-HR${String(i).padStart(3,"0")}`, clientId:c.id, farm:c.business, crop,
      plantingDate:`2025-${String(((i+ci)%8)+1).padStart(2,"0")}-${String(((i*2)%25)+1).padStart(2,"0")}`,
      harvestDate:`2026-${String(((i+ci)%9)+1).padStart(2,"0")}-${String(((i*3+5)%27)+1).padStart(2,"0")}`,
      season:(i%2===0)?"2025/2026 summer":"2025 winter", areaHa:area, quantityKg:qty,
      yieldPerHa:money(qty/area), salesValue:money(qty*(crop==="Vegetables"?7.5:crop==="Beans"?18:crop==="Soybeans"?9.2:6.4)),
      status:"Recorded", notes:i%4===0?"Irrigation supported":"Standard seasonal harvest"
    });
  }
});
