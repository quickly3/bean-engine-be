import * as fs from 'fs';

const items = [
  '5G',
  '实名·真实学历',
  '关于我',
  '基础资料',
  '兴趣爱好',
  '感情观',
  '我的唠唠',
  '心仪的ta',
  '性格类型',
  '灵魂测试',
];

const melas = 'org_data/male';

function removeDuplicates(str) {
  let result = '';
  for (const char of str) {
    if (!result.includes(char)) {
      result += char;
    }
  }
  return result;
}

function matchName(fstr) {
  const name_r = new RegExp(`${items[0]}([\\s\\S]*?)${items[1]}`, 'g');
  const match = name_r.exec(fstr);

  if (match && match[1]) {
    const name = removeDuplicates(match[1].trim());
    return name.trim();
  }
  return null;
}

function matchUni(fstr) {
  const name_r = new RegExp(`${items[1]}([\\s\\S]*?)${items[2]}`, 'g');
  const match = name_r.exec(fstr);

  if (match && match[1]) {
    const lines = match[1].split('\n');
    const age = lines[1].replace(/岁.*/, '');
    const uni = lines[1].replace(/.*·/, '');

    return {
      age,
      uni,
    };
  }
  return null;
}

function matchAboutMe(fstr) {
  const name_r = new RegExp(`${items[2]}([\\s\\S]*?)${items[3]}`, 'g');
  const match = name_r.exec(fstr);

  if (match && match[1]) {
    console.log(match[1]);
  }
  return null;
}

async function boostrap() {
  const files = fs.readdirSync(melas);
  for (const f of files) {
    const fstr = fs.readFileSync(`${melas}/${f}`).toString();

    const name = matchName(fstr);
    const age_nui = matchUni(fstr);
    const aboutMe = matchAboutMe(fstr);

    const user = {
      gender: 'male',
      name,
      ...age_nui,
      aboutMe,
    };

    console.log(user);
  }
}

boostrap();
