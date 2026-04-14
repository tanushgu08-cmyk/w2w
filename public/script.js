// ================== SUPABASE SETUP ==================
const SUPABASE_URL = "https://zpnlalxsmdctmqeuudbk.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwbmxhbHhzbWRjdG1xZXV1ZGJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2ODI4NzEsImV4cCI6MjA4OTI1ODg3MX0.yv8344zoQCaYtR_Q-tpD_0Qm6DCrbTwt22ft4IZ230g";

let client;
let lastNotificationCount = 0;

if (window.supabase) {
    client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} else {
    console.error("Supabase not loaded ❌");
}

// ✅ ADMIN CHECK
const isAdmin = localStorage.getItem("isAdmin");

if (isAdmin !== "true") {
    const bell = document.getElementById("notificationBell");
    if (bell) bell.style.display = "none";
}

// ================== LOCATION ==================
let map, marker;
let locationAvailable = false;
let locationLayerGroup = null;
let routeLayer = null;

function notifyLocationError(message) {
    console.error(message);
    if (document.getElementById('locationError')) {
        document.getElementById('locationError').innerText = message;
    }
}

// 🌍 LIVE TRACKING
function startTracking() {
    if (!navigator.geolocation) {
        notifyLocationError('Geolocation is not supported by your browser.');
        return;
    }

    navigator.geolocation.watchPosition((pos) => {

    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    
    const volunteerId = localStorage.getItem("volunteerId");
    const donorId = localStorage.getItem("donorId");

    if (volunteerId) {
        client.from("volunteers")
            .update({
                lat: lat,
                lng: lng
            })
            .eq("id", Number(volunteerId));
    }

    if (donorId) {
        client.from("donors")
            .update({
                donor_lat: lat,
                donor_lng: lng
            })
            .eq("id", Number(donorId));
    }

    console.log("Live Location:", lat, lng);
    locationAvailable = true;
    notifyLocationError('');

    if (!map) {
        map = L.map('map').setView([lat, lng], 15);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: "© OpenStreetMap"
        }).addTo(map);

        locationLayerGroup = L.layerGroup().addTo(map);

        marker = L.marker([lat, lng]).addTo(map)
            .bindPopup("You are here")
            .openPopup();

        loadAllLocations();

        setInterval(() => {
            if (map) {
                loadAllLocations();
            }
        }, 10000);
// Test Route


    } else {
        marker.setLatLng([lat, lng]);
        map.setView([lat, lng]);
    }

}, (err) => {
    let message = 'Unable to detect location. Please enable location permissions and refresh the page.';
    if (err.code === 1) {
        message = 'Location permission denied. Please allow location access in your browser settings.';
    } else if (err.code === 2) {
        message = 'Location unavailable. Please try again in a different location.';
    } else if (err.code === 3) {
        message = 'Location request timed out. Please try again.';
    }
    locationAvailable = false;
    notifyLocationError(message);
    alert(message);
    
}, {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0
});
}

// ================== EMERGENCY FORM ==================
const emergencyForm = document.getElementById("emergencyForm");

if (emergencyForm) {
    emergencyForm.addEventListener("submit", async function (e) {
        e.preventDefault();

        const formData = new FormData(emergencyForm);

        const data = {
            name: formData.get("name"),
            phone: formData.get("phone"),
            location: formData.get("location"),
            need_type: formData.get("need_type"),
            message: formData.get("message")
        };

        try {
            const { error } = await client
                .from("emergency_requests")
                .insert([data]);

            if (error) {
                console.error(error);
                alert("Error saving emergency request");
                return;
            }

            alert("Emergency request submitted successfully");
            emergencyForm.reset();

        } catch (err) {
            console.error(err);
            alert("Something went wrong");
        }
    });
}

// ================== VOLUNTEER COUNT ==================
let volunteers = localStorage.getItem("volunteers") || 0;
const volunteerBox = document.getElementById("volunteerStat");

if (volunteerBox) {
    volunteerBox.innerText = volunteers;
}

// ================== POPUP ==================
window.addEventListener("load", function () {
    console.log("Page Loaded ✅");

    let popup = document.getElementById("welcomePopup");

    if (popup) {
        console.log("Popup Found ✅");
        popup.classList.add("show");
    } else {
        console.log("Popup NOT Found ❌");
    }

    updateStats();
});

function closePopup() {
    const popup = document.getElementById("welcomePopup");
    if (popup) popup.classList.remove("show");
    

    playNotificationSound();
    vibratePhone();
}

// ================== DONOR REGISTRATION ==================
const donorForm = document.getElementById("donorForm");

if (donorForm) {
    donorForm.addEventListener("submit", async function (e) {
        e.preventDefault();

        const termsChecked = document.getElementById("donorTerms");

if (!termsChecked || !termsChecked.checked) {
    alert("Please accept Terms & Conditions ❗");
    return;
}

        const formData = new FormData(donorForm);
        const rawData = Object.fromEntries(formData.entries());

      const data = {
    name: rawData.ownerName,
    phone: rawData.phone,
    location: rawData.address,
    id_type: rawData.donorType,
    id_number: rawData.businessName,
    rating: rawData.rating ? Number(rawData.rating) : null,
    status: "pending"   
};
        try {
            const { data: insertedDonor, error } = await client
                .from("donors")
                .insert([data])
                .select();

            if (error) {
                console.error(error);
                alert("Error saving donor data");
                return;
            }

            if (insertedDonor && insertedDonor.length) {
                localStorage.setItem("donorId", insertedDonor[0].id);
            }

            let restaurantsConnected = Number(localStorage.getItem("restaurantsConnected") || 0);
            restaurantsConnected++;
            localStorage.setItem("restaurantsConnected", restaurantsConnected);

            alert("Donor Registered Successfully");

// Show food form and hide donor form
document.getElementById("donorForm").style.display = "none";
document.getElementById("foodForm").style.display = "block";

updateStats();
donorForm.reset();
            updateStats();
            donorForm.reset();

        } catch (err) {
            console.error(err);
            alert("Something went wrong");
        }
    });
}

// ================== DONOR TYPE ==================
const donorType = document.getElementById("donorType");

if (donorType) {
    donorType.addEventListener("change", function () {
   let ratingWrapper = document.getElementById("ratingWrapper");
if (!ratingWrapper) return;

ratingWrapper.style.display = this.value === "restaurant" ? "block" : "none";
    });
}
// ================== STAR RATING ==================
let stars = document.querySelectorAll("#ratingStars span");
let ratingInput = document.getElementById("rating");

if (stars.length > 0 && ratingInput) {
    stars.forEach((star, index) => {
        star.addEventListener("click", () => {
            ratingInput.value = star.dataset.value;

            stars.forEach(s => s.classList.remove("active"));

            for (let i = 0; i <= index; i++) {
                stars[i].classList.add("active");
            }
        });
    });
}
// ================== FOOD DONATION ==================
const foodForm = document.getElementById("foodForm");

if (foodForm) {
    foodForm.addEventListener("submit", async function (e) {
        e.preventDefault();

        const formData = new FormData(foodForm);

       if (!marker || !locationAvailable) {
    alert("Location not detected yet ❌\nPlease allow location access in your browser and reload the page before submitting.");
    return;
}

const lat = marker.getLatLng().lat;
const lng = marker.getLatLng().lng;

const data = {
    quantity: formData.get("quantity"),
    food_type: formData.get("food_type"),
    delivery_time: formData.get("delivery_time"),
    status: "pending"
};

        const { error } = await client
            .from("food_donations")
            .insert([data]);

        if (error) {
            alert(error.message);
            return;
        }

        alert("Food Donation Added ✅");
        foodForm.reset();
    });
}


// ================== VOLUNTEER REGISTRATION ==================
const volunteerForm = document.getElementById("volunteerForm");

if (volunteerForm) {
    volunteerForm.addEventListener("submit", async function (e) {
        e.preventDefault();

        const termsChecked = document.getElementById("volunteerTerms");

if (!termsChecked || !termsChecked.checked) {
    alert("Please accept Terms & Conditions ❗");
    return;
}

        const formData = new FormData(volunteerForm);

       const data = {
    name: formData.get("name"),
    phone: formData.get("phone"),
    location: formData.get("location"),
    id_type: formData.get("id_type"),
    id_number: formData.get("id_number"),
    status: "pending"   
};

        try {
            const { data: insertedVolunteer, error } = await client
                .from("volunteers")
                .insert([data])
                .select();

            if (error) {
                console.error(error);
                alert("Error saving volunteer data");
                return;
            }

            if (insertedVolunteer && insertedVolunteer.length) {
                localStorage.setItem("volunteerId", insertedVolunteer[0].id);
            }

            let volunteers = Number(localStorage.getItem("volunteers") || 0);
            volunteers++;
            localStorage.setItem("volunteers", volunteers);

            const volunteerStat = document.getElementById("volunteerStat");
            if (volunteerStat) {
                volunteerStat.innerText = volunteers;
            }

            alert("Volunteer Registered Successfully");

// store ID (TEMPORARY METHOD)


        } catch (err) {
            console.error(err);
            alert("Something went wrong");
        }
    });
}

async function loadAllLocations() {
    if (!map) return;
    if (!locationLayerGroup) {
        locationLayerGroup = L.layerGroup().addTo(map);
    }
    locationLayerGroup.clearLayers();

    const { data: donors } = await client.from("donors").select("*").eq("status","approved");
    const { data: volunteers } = await client.from("volunteers").select("*").eq("status","approved");

    donors.forEach(d => {
      if (d.donor_lat && d.donor_lng) {
          L.marker([d.donor_lat, d.donor_lng]).addTo(locationLayerGroup)
              .bindPopup("Donor: " + d.name);
        }
    });

    volunteers.forEach(v => {
        if (v.lat && v.lng) {
            L.marker([v.lat, v.lng]).addTo(locationLayerGroup)
                .bindPopup("Volunteer: " + v.name);
        }
    });
}

function drawRoute(fromLat, fromLng, toLat, toLng) {
    if (routeLayer) {
        routeLayer.remove();
    }

    routeLayer = L.polyline([
        [fromLat, fromLng],
        [toLat, toLng]
    ], { color: 'blue', weight: 4, opacity: 0.8 }).addTo(map);

    map.fitBounds(routeLayer.getBounds().pad(0.5));
}

// ================== LOAD DELIVERIES ==================
async function loadAvailableDeliveries() {

    const { data, error } = await client
        .from("food_donations")
        .select("*")
.eq("status", "pending")

    const box = document.getElementById("deliveryList");
    if (!box) return;

    if (error) {
        box.innerHTML = "Error loading deliveries";
        return;
    }

    if (!data.length) {
        box.innerHTML = "No deliveries available";
        return;
    }

    box.innerHTML = data.map(d => `
        <div class="list-item">
            🍱 Quantity: ${d.quantity} <br>
            🥗 Type: ${d.food_type} <br>
            ⏰ Time: ${d.delivery_time} <br>

            <button onclick="acceptDelivery(${d.id})">Accept</button>
            <button onclick="rejectDelivery(${d.id})">Reject</button>
        </div>
    `).join("");
}

//Accept/Reject Delivery
async function acceptDelivery(id) {

    const { data } = await client
        .from("food_donations")
        .select("*")
        .eq("id", id)
        .single();

    await client
        .from("food_donations")
        .update({ status: "accepted" })
        .eq("id", id);

    alert("Delivery Accepted 🚚");

    if (data && marker) {
        let toLat = data.donor_lat;
        let toLng = data.donor_lng;

        if ((!toLat || !toLng) && data.donor_id) {
            const { data: donor, error: donorError } = await client
                .from("donors")
                .select("lat, lng")
                .eq("id", data.donor_id)
                .single();

            if (!donorError && donor) {
                toLat = donor.lat;
                toLng = donor.lng;
            }
        }

        if (toLat && toLng) {
            drawRoute(
                marker.getLatLng().lat,
                marker.getLatLng().lng,
                toLat,
                toLng
            );
        } else {
            alert("Delivery accepted, but donor location is not available for route display.");
        }
    }

    loadAvailableDeliveries();
}

async function rejectDelivery(id) {

    await client
        .from("food_donations")
        .update({ status: "rejected" })
        .eq("id", id);

    loadAvailableDeliveries();
}

// ================== IMPACT SYSTEM ==================
function updateStats() {
    let today = new Date().toLocaleDateString();

    let storedDate = localStorage.getItem("date");
    let todayMeals = localStorage.getItem("todayMeals") || 0;
    let totalMeals = localStorage.getItem("totalMeals") || 0;

    if (storedDate !== today) {
        todayMeals = 0;
        localStorage.setItem("date", today);
        localStorage.setItem("todayMeals", 0);
    }

    const todayMealsBox = document.getElementById("todayMeals");
    const totalResources = document.getElementById("totalResources");
    const totalMealsStat = document.getElementById("totalMealsStat");
    const foodSavedStat = document.getElementById("foodSavedStat");
    const restaurantsConnected = document.getElementById("restaurantsConnected");

    if (todayMealsBox) todayMealsBox.innerText = todayMeals;
    if (totalResources) totalResources.innerText = totalMeals;
    if (totalMealsStat) totalMealsStat.innerText = totalMeals + "+";
    if (foodSavedStat) foodSavedStat.innerText = (totalMeals * 0.4).toFixed(0) + "kg";
    if (restaurantsConnected) {
        restaurantsConnected.innerText = localStorage.getItem("restaurantsConnected") || 0;
    }
}

// ================== DELIVERY ==================
async function deliveryDone(volunteerId) {

    const { data, error } = await client
        .from("volunteers")
        .select("deliveries")
        .eq("id", Number(volunteerId))
        .single();

    if (error) {
        alert(error.message);
        return;
    }

    const newCount = (data.deliveries || 0) + 1;

    await client
        .from("volunteers")
        .update({ deliveries: newCount })
        .eq("id", Number(volunteerId));

    alert("Delivery Done ✅");

    loadLeaderboard(); // 🔥 update instantly
}
// Show leaderboard
async function loadLeaderboard() {
    const { data, error } = await client
        .from("volunteers")
        .select("name, deliveries")
        .eq("status", "approved")
        .order("deliveries", { ascending: false });

    const box = document.getElementById("leaderboard");
    if (!box) return;

    if (error) {
        box.innerHTML = "Error loading leaderboard";
        return;
    }

    if (!data.length) {
        box.innerHTML = "No data yet";
        return;
    }

    

   box.innerHTML = data.map((v, index) => {

    let badge = "";
    if (index === 0) badge = "🥇";
    else if (index === 1) badge = "🥈";
    else if (index === 2) badge = "🥉";
    else badge = `#${index + 1}`;

    return `
        <div class="leaderboard-card">
            <div class="rank">${badge}</div>
            <div class="name">${v.name}</div>
            <div class="deliveries">${v.deliveries || 0} 🍱</div>
        </div>
    `;
}).join("");
}


function showSection(sectionId) {
    if (sectionId === "volunteerSection") {
    loadAvailableDeliveries();
}
    const sections = document.querySelectorAll("section");

    sections.forEach(sec => {
        sec.style.display = "none";
    });

    const active = document.getElementById(sectionId);
    if (active) active.style.display = "block";

    // Load leaderboard only when opened
    if (sectionId === "leaderboardSection") {
        loadLeaderboard();
    }
}

// 🔴 REAL-TIME LEADERBOARD UPDATE
client
  .channel('leaderboard-changes')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'volunteers'
    },
    () => {
      console.log("Leaderboard Updated 🔄");

      // Only update if section is visible
      const section = document.getElementById("leaderboardSection");
      if (section && section.style.display !== "none") {
        loadLeaderboard();
      }
    }
  )
  .subscribe();

  // 🔄 AUTO REFRESH LEADERBOARD EVERY 3 SECONDS
setInterval(() => {
    const section = document.getElementById("leaderboardSection");

    // Only refresh when leaderboard is visible
    if (section && section.style.display !== "none") {
        loadLeaderboard();
    }
}, 3000);

// ================== IMPACT PAGE STATS ==================
function loadImpactStats() {
    const todayMealsEl = document.getElementById("todayMeals");
    const totalResourcesEl = document.getElementById("totalResources");
    const restaurantsConnectedEl = document.getElementById("restaurantsConnected");

    if (!todayMealsEl && !totalResourcesEl && !restaurantsConnectedEl) return;

    let todayMeals = Number(localStorage.getItem("todayMeals") || 0);
    let totalMeals = Number(localStorage.getItem("totalMeals") || 0);
    let restaurantsConnected = Number(localStorage.getItem("restaurantsConnected") || 0);

    if (todayMealsEl) todayMealsEl.innerText = todayMeals;
    if (totalResourcesEl) totalResourcesEl.innerText = totalMeals;
    if (restaurantsConnectedEl) restaurantsConnectedEl.innerText = restaurantsConnected;
}

loadImpactStats();

// ================== RECORDS PAGE DATA ==================
const donorList = document.getElementById("donorList");
const volunteerList = document.getElementById("volunteerList");

async function loadRecordsData() {
    if (!donorList || !volunteerList || !client) return;

   const { data: donors, error: donorError } = await client
    .from("donors")
    .select("*")
    .eq("status", "approved")   // 
    .order("id", { ascending: false });

    if (donorError) {
        console.error(donorError);
        donorList.innerHTML = "<p>Error loading donors</p>";
    } else if (!donors || donors.length === 0) {
        donorList.innerHTML = "<p>No donors registered yet</p>";
    } else {
  donorList.innerHTML = donors.map(donor => `
    <div class="list-item">
        <strong>Name:</strong> ${donor.name}<br>
        <strong>Phone:</strong> ${donor.phone}<br>
        <strong>Location:</strong> ${donor.location}<br>
        <strong>Type:</strong> ${donor.id_type}<br>
        <strong>ID / Business:</strong> ${donor.id_number}<br>
        <strong>Rating:</strong> ${donor.rating ? getStarRating(donor.rating) : "No rating"}
    </div>
`).join("");
    }

    const { data: volunteers, error: volunteerError } = await client
    .from("volunteers")
    .select("*")
    .eq("status", "approved") 
    .order("id", { ascending: false });

    if (volunteerError) {
        console.error(volunteerError);
        volunteerList.innerHTML = "<p>Error loading volunteers</p>";
    } else if (!volunteers || volunteers.length === 0) {
        volunteerList.innerHTML = "<p>No volunteers registered yet</p>";
    } else {
        volunteerList.innerHTML = volunteers.map(volunteer => `
            <div class="list-item">
                <strong>Name:</strong> ${volunteer.name}<br>
                <strong>Phone:</strong> ${volunteer.phone}<br>
                <strong>Location:</strong> ${volunteer.location}<br>
                <strong>ID Type:</strong> ${volunteer.id_type}<br>
                <strong>ID Number:</strong> ${volunteer.id_number}
            </div>
        `).join("");
    }
}

function getStarRating(rating) {
    let fullStars = Math.floor(rating);
    let emptyStars = 5 - fullStars;
    return "★".repeat(fullStars) + "☆".repeat(emptyStars);

}
loadRecordsData();

// ================== ADMIN APPROVAL ==================

// Load pending donors
async function loadPendingDonors() {
    const { data, error } = await client
        .from("donors")
        .select("*")
        .eq("status", "pending");

    const box = document.getElementById("pendingDonors");
    if (!box) return;

    if (error) {
        box.innerHTML = "Error loading donors";
        return;
    }

    if (!data.length) {
        box.innerHTML = "No pending donors";
        return;
    }

    box.innerHTML = data.map(d => `
        <div>
            ${d.name} (${d.phone})
          <button onclick="approveDonor(${d.id})">Approve</button>
        </div>
    `).join("");
}

// Approve donor
async function approveDonor(id) {
    const { error } = await client
        .from("donors")
        .update({ status: "approved" })
        .eq("id", Number(id))

  if (error) {
    console.error("Supabase Error:", error);
    alert(error.message);   
    return;
}

    alert("Donor Approved ✅");
loadPendingDonors();
loadPendingVolunteers();
loadNotifications();

}

// Load pending volunteers
async function loadPendingVolunteers() {
    const { data, error } = await client
        .from("volunteers")
        .select("*")
        .eq("status", "pending");

    const box = document.getElementById("pendingVolunteers");
    if (!box) return;

    if (error) {
        box.innerHTML = "Error loading volunteers";
        return;
    }

    if (!data.length) {
        box.innerHTML = "No pending volunteers";
        return;
    }

    box.innerHTML = data.map(v => `
        <div>
            ${v.name} (${v.phone})
           <button onclick="approveVolunteer(${v.id})">Approve</button>
    </div>
           `).join("");
}

// Approve volunteer
async function approveVolunteer(id) {
    const { error } = await client
        .from("volunteers")
        .update({ status: "approved" })
        .eq("id", Number(id))

    if (error) {
        alert("Error approving ❌");
        console.log(error);
        return;
    }

   alert("Volunteer Approved ✅");
   
loadNotifications();
loadPendingVolunteers();  // ✅ refresh list
}

// Auto load when admin page opens
loadPendingDonors();
loadPendingVolunteers();


// ================== NOTIFICATIONS ==================
function toggleNotifications() {
    const panel = document.getElementById("notifPanel");
    panel.style.display = panel.style.display === "block" ? "none" : "block";
}
// Load notifications

async function loadNotifications() {

    const donorBox = document.getElementById("pendingDonors");
    const volunteerBox = document.getElementById("pendingVolunteers");
    const countBox = document.getElementById("notifCount");

    if (!donorBox || !volunteerBox || !countBox) return;

    // DONORS
    const { data: donors } = await client
        .from("donors")
        .select("*")
        .eq("status", "pending");

    // VOLUNTEERS
    const { data: volunteers } = await client
        .from("volunteers")
        .select("*")
        .eq("status", "pending");

    let total = (donors?.length || 0) + (volunteers?.length || 0);
countBox.innerText = total;

// 🔔 AUTO SOUND + VIBRATION
if (total > lastNotificationCount) {
    playNotificationSound();
    vibratePhone();
}

lastNotificationCount = total;

   
    // Show donors
    donorBox.innerHTML = "<h4>Donors</h4>" + (donors?.map(d => `
        <div class="notif-item">
            ${d.name}
            <br>
            <button class="approve" onclick="approveDonor(${d.id})">Approve</button>
            <button class="reject" onclick="rejectDonor(${d.id})">Reject</button>
        </div>
    `).join("") || "No pending");

    // Show volunteers
    volunteerBox.innerHTML = "<h4>Volunteers</h4>" + (volunteers?.map(v => `
        <div class="notif-item">
            ${v.name}
            <br>
            <button class="approve" onclick="approveVolunteer(${v.id})">Approve</button>
            <button class="reject" onclick="rejectVolunteer(${v.id})">Reject</button>
        </div>
    `).join("") || "No pending");
}

// Reject functions
async function rejectDonor(id) {
    let reason = prompt("Enter rejection reason:");

    if (!reason) {
        alert("Reason required ❌");
        return;
    }

    const { error } = await client
        .from("donors")
        .update({
            status: "rejected",
            rejection_reason: reason
        })
        .eq("id", Number(id));

    if (error) {
        alert(error.message);
        return;
    }

    alert("Donor Rejected ❌");
    loadNotifications();
}


async function rejectVolunteer(id) {
    let reason = prompt("Enter rejection reason:");

    if (!reason) return;

    await client
        .from("volunteers")
        .update({
            status: "rejected",
            rejection_reason: reason
        })
        .eq("id", Number(id));

    alert("Volunteer Rejected ❌");
    loadNotifications();
}

// Auto load notifications every 10 seconds
setInterval(loadNotifications, 10000);
loadNotifications();

//Auto Update Notifications in real-time
client
  .channel('notifications')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'volunteers'
    },
    () => {
      loadNotifications();
    }
  )
  .subscribe();

  client
  .channel('donor-changes')
  .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'donors'
  }, () => {
      loadNotifications();
  })
  .subscribe();

  //Admin Login System
  function adminLogin() {
    const email = document.getElementById("adminEmail").value;
    const pass = document.getElementById("adminPass").value;

    if (email === "admin@gmail.com" && pass === "1234") {
        localStorage.setItem("isAdmin", "true");
        alert("Login Success ✅");
        window.location.href = "index.html";
    } else {
        alert("Invalid Credentials ❌");
    }
}

// Admin Logout
function adminLogout() {
    localStorage.removeItem("isAdmin");
    alert("Logged out ❌");
    window.location.reload();
}

// 🔔 SOUND FUNCTION
function playNotificationSound() {
    const sound = document.getElementById("notifSound");
    if (sound) {
        sound.currentTime = 0;
        sound.play().catch(() => {});
    }
}

// 📳 VIBRATION FUNCTION
function vibratePhone() {
    if (navigator.vibrate) {
        navigator.vibrate([300, 100, 300]);
    }
}
loadAvailableDeliveries();
startTracking();  