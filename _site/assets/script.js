const emailSynth = new Tone.Synth().toDestination();
const instagramSynth = new Tone.Synth().toDestination();
const resumeSynth = new Tone.Synth().toDestination();
const playEmailSound = () => emailSynth.triggerAttackRelease("C4", "8n");
const playInstagramSound = () => instagramSynth.triggerAttackRelease("E4", "8n");
const playResumeSound = () => resumeSynth.triggerAttackRelease("G4", "8n");
const emailLink = document.querySelector('#links a[href^="mailto"]');
const instagramLink = document.querySelector('#links a[href*="instagram"]');
const resumeLink = document.querySelector('#links a[href*="read.cv"]');
let selectedFilters = [];

function filterSelection(category) {
    let items = document.getElementsByClassName("media-item");

    if (selectedFilters.includes(category)) {
        selectedFilters = selectedFilters.filter(filter => filter !== category);
        document.getElementById(category + "-filter").classList.remove("selected");
    } else {
        selectedFilters.push(category);
        document.getElementById(category + "-filter").classList.add("selected");
    }

    if (selectedFilters.length === 0) {
        for (let i = 0; i < items.length; i++) {
            items[i].classList.remove("hiding");
            items[i].classList.remove("hidden");
            items[i].style.display = "";
        }
        return;
    }

    for (let i = 0; i < items.length; i++) {
        let match = selectedFilters.some(filter => items[i].className.indexOf(filter) > -1);
        if (match) {
            if (items[i].classList.contains("hidden")) {
                items[i].classList.remove("hidden");
                items[i].style.display = "";
            }
            items[i].classList.remove("hiding");
        } else {
            items[i].classList.add("hiding");
        }
    }
}

function clearFilter() {
    let items = document.getElementsByClassName("media-item");
    let buttons = document.getElementsByClassName("filter-button");

    selectedFilters = [];

    for (let i = 0; i < buttons.length; i++) {
        buttons[i].classList.remove("selected");
    }

    for (let i = 0; i < items.length; i++) {
        items[i].classList.remove("hidden");
        items[i].classList.remove("hiding");
        items[i].style.display = "";
    }
}

document.addEventListener("transitionend", (event) => {
    if (event.propertyName === "opacity" && event.target.classList.contains("hiding")) {
        event.target.classList.add("hidden");
        event.target.classList.remove("hiding");
        event.target.style.display = "none";
    }
});

emailLink.addEventListener('mouseenter', playEmailSound);
instagramLink.addEventListener('mouseenter', playInstagramSound);
resumeLink.addEventListener('mouseenter', playResumeSound);
