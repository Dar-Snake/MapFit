'use strict';



class Workout {
    date = new Date();
    id = (Date.now()+"").slice(-10);
    clicks = 0;

    constructor(coords,distance,duration){
        this.coords=coords; 
        this.distance=distance; // km
        this.duration=duration; // min
    }
    _setDescription(){
        // prettier-ignore
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

        this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`
    }
    click(){
        this.clicks++;
    }
}

class Running extends Workout{
    type = 'running'
    constructor(coords,distance,duration,cadence){
        super(coords,distance,duration);
        this.cadence=cadence;
        this.calcPace();
        this._setDescription();
    }

    calcPace(){
        this.pace = this.duration/ this.distance;
        return this.pace;
    }
}

class Cycling extends Workout{
    type= 'cycling'
    constructor(coords,distance,duration,elevationGain){
        super(coords,distance,duration);
        this.elevationGain=elevationGain;
        this.calcSpeed();
        this._setDescription();
    }

    calcSpeed(){
        this.speed = this.distance/ (this.duration/ 60)
    }
}

///////////////////////////////////////
// Application Architecture

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];
  #markers = new Map();

  constructor() {
    // Get user's position
    this._getPosition();

    // Get data from local storage
    this._getLocalStorage();

    // Attach event handlers
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    containerWorkouts.addEventListener('click', this._handleWorkoutActions.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position');
        }
      );
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // Handling clicks on map
    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = '';

    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    const validInputs = (...inputs) => inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();

    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    if (type === 'running') {
      const cadence = +inputCadence.value;
      if (!validInputs(distance, duration, cadence) || !allPositive(distance, duration, cadence)) {
        return alert('Inputs should be positive numbers');
      }
      workout = new Running([lat, lng], distance, duration, cadence);
    }

    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      if (!validInputs(distance, duration, elevation) || !allPositive(distance, duration)) {
        return alert('Inputs should be positive numbers');
      }
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    this.#workouts.push(workout);

    this._renderWorkoutMarker(workout);
    this._renderWorkout(workout);
    this._hideForm();
    this._setLocalStorage();
  }

  _renderWorkout(workout) {
    let html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <div class="workout__header">
          <h2 class="workout__title">${workout.description}</h2>
          <button class="workout__delete">×</button>
        </div>
        <div class="workout__details">
          <span class="workout__icon">${workout.type === 'running' ? '👟' : '🚵'}</span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⌛</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>
    `;

    if (workout.type === 'running')
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.pace.toFixed(1)}</span>
          <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value">${workout.cadence}</span>
          <span class="workout__unit">spm</span>
        </div>
      </li>
      `;

    if (workout.type === 'cycling')
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.speed.toFixed(1)}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <span class="workout__value">${workout.elevationGain}</span>
          <span class="workout__unit">m</span>
        </div>
      </li>
      `;

    form.insertAdjacentHTML('afterend', html);
  }

  _renderWorkoutMarker(workout) {
    const marker = L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(workout.description)
      .openPopup();

    this.#markers.set(workout.id, marker);
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;

    const workout = this.#workouts.find(work => work.id === workoutEl.dataset.id);

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });

    workout.click();
  }

  _handleWorkoutActions(e) {
    const deleteBtn = e.target.closest('.workout__delete');
    if (deleteBtn) {
      this._showDeletePopup(deleteBtn);
    }
  }

  _showDeletePopup(deleteBtn) {
    const popup = document.getElementById('deletePopup');
    popup.classList.remove('hidden');

    const confirmBtn = popup.querySelector('.popup__btn--confirm');
    const cancelBtn = popup.querySelector('.popup__btn--cancel');

    confirmBtn.onclick = () => {
      this._deleteWorkout(deleteBtn);
      popup.classList.add('hidden');
    };

    cancelBtn.onclick = () => {
      popup.classList.add('hidden');
    };
  }

  _deleteWorkout(deleteBtn) {
    const workoutEl = deleteBtn.closest('.workout');
    const workout = this.#workouts.find(w => w.id === workoutEl.dataset.id);

    this.#workouts = this.#workouts.filter(w => w.id !== workout.id);

    this.#markers.get(workout.id).remove();
    this.#markers.delete(workout.id);

    workoutEl.remove();

    this._setLocalStorage();
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    if (!data) return;

    this.#workouts = data;
    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }
}

const app = new App();
