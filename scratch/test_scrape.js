

async function test() {
  try {
    const res = await fetch('https://pixabay.com/music/search/relax/');
    const html = await res.text();
    console.log("HTML length:", html.length);
    console.log("Sample HTML:", html.slice(0, 1000));
  } catch (e) {
    console.error("Fetch error:", e);
  }
}

test();
