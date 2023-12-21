import fetch from "cross-fetch";
import { jwtDecode } from "jwt-decode";
import prompts from "prompts";
import { LocalStorage } from "node-localstorage";
import { JWTType, Animal, Choice, Pet } from "./types";
const localStorage = new LocalStorage("./scratch");//instantiate and directory path

class FinalProject {
  #apiKey = "7rcWlG1jTkSyKDVcKkT2gsK0X8x8wjaYVyA63A16Fdvnh3qNOx";
  #secretKey = "v07CGa6J1tCIpup4j3JmQxzV9e5C0QfMcrTTrOjl";
  #accessTokenKey = "";
  #expireAccessToken: number = 0;
  #url = "https://api.petfinder.com/v2/";
  #animals: Animal[] = [];

  //Reads the access token and its expiration time from local storage.
  async readLocalAccessToken() {
    const rawData = localStorage.getItem("access-token");
    if (rawData) {
      const { accessToken } = JSON.parse(rawData);
      this.#accessTokenKey = accessToken.key;
      this.#expireAccessToken = accessToken.exp;
    }
  }
  /*Requests a new access token from the Petfinder API using the 
  client credentials grant type.
  */
  async requestAccessToken() {
    const reqBody = {
      grant_type: "client_credentials",
      client_id: this.#apiKey,
      client_secret: this.#secretKey,
    };
    const rawResponse = await fetch(`${this.#url}oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reqBody),
    });
    const response = await rawResponse.json();
    this.#accessTokenKey = response.access_token;
    console.log("AccessToken - Generated");
    await this.decodeToJwt();// whay this??
  }
  //Saves the current access token and its expiration time to local storage.
  saveLocalAccessToken() {
    const accessTokenObj = {
      accessToken: {
        key: this.#accessTokenKey,
        exp: this.#expireAccessToken,
      },
    };
    localStorage.setItem("access-token", JSON.stringify(accessTokenObj));
  }
  /*Decodes the access token using jwt-decode, saves the decoded token to local storage,
   and prompts the user.
  */
  decodeToJwt(): void {

    const accessToken = this.#accessTokenKey;// assignin
    const decoded = jwtDecode<JWTType>(accessToken);//decoding
    this.#expireAccessToken = decoded.exp * 1000;
    // Save decoded data and expiration time in local storage
    const dataDecode = { token: decoded, expTime: decoded.exp };
    localStorage.setItem("token-decode", JSON.stringify(dataDecode));

    this.saveLocalAccessToken();// what is it doing here?

    // Read decoded data from local storage
    const readData = localStorage.getItem("token-decode");
    // Parse the data if it exists
    let readDataParse;
    if (readData) {
      readDataParse = JSON.parse(readData);
    }
    this.promptUser();// wht is it doing here
  }
  /* Fetches pet data from the Petfinder API based on type and gender,
   handling access token expiration.
  */
  async fetchPetData(type: string, gender: string) {
    try {
      if (this.#expireAccessToken < Date.now()) {
        console.log("Access Token Expired, Getting new one!");
        this.requestAccessToken();
      }
      const url = "https://api.petfinder.com/v2/animals";
      const reqUrl = `${url}?type=${type}&gender=${gender}`;
      const rawResponse = await fetch(reqUrl, {// fetch url using quet string
        headers: { Authorization: `Bearer ${this.#accessTokenKey}` },
      });
      const data = await rawResponse.json();
      for (const animal of data.animals) {
        this.#animals.push({
          title: animal.name,
          value: animal.id,
        });
      }
      const userChoice = await this.selectPrompt(
        "id",
        "Select 1 Pet:",
        this.#animals
      );
      const id = userChoice.id;
      const rawResponse2 = await fetch(`${url}/${id}`, {// fetch pet by details
        headers: { Authorization: `Bearer ${this.#accessTokenKey}` },
      });
      const data2 = await rawResponse2.json();
      console.log(
        "########################################################################################################################"
      );
      let { animal } = data2;// why destructuring?

      animal = {
        name: animal.name,
        breeds: animal.breeds,
        size: animal.size,
        age: animal.age,
        colors: animal.colors,
        status: animal.status,
        id: animal.id,
      };
      const pet: Pet = {// for book mark
        [animal.id]: animal.name,
      };
      console.log(
        "                                     ----- Your Pick ----- "
      );
      console.log(animal.name);
      console.log(animal);
      console.log(
        "########################################################################################################################"
      );
      // this.promptUser();
      this.secoundQuestion(pet);
    } catch (e) {
      console.log("Error - fetchPetData: ", e);
    }
  }
  //Bookmarks a selected pet by saving it to local storage.
  bookmarkPet(pet: Pet) {
    console.log(pet);
    const readBookmark = localStorage.getItem("bookmark");
    if (!readBookmark) {
      localStorage.setItem("bookmark", JSON.stringify(pet));
    } else {
      console.log(`
      File Found. Reading...
      `);
      const bookmark = JSON.parse(readBookmark);
      const id = Object.keys(pet)[0];
      if (!bookmark.hasOwnProperty(id)) {
        const value = Object.values(pet)[0];
        bookmark[id] = value;
        localStorage.setItem("bookmark", JSON.stringify(bookmark));
        console.log(bookmark);
      } else {
        console.log("Pet already exist");
      }
    }
  }
  // Removes a bookmarked pet from the list.
  removeBookmarkedPet(pet: Pet) {
    const petValue = Object.values(pet);
    console.log(`
    Removing BookMarked...
    ${petValue} `);
    const readBookmark = localStorage.getItem("bookmark");
    if (!readBookmark) console.log("File not found");
    else {
      const bookmark = JSON.parse(readBookmark);
      const id = Object.keys(pet)[0];
      if (bookmark.hasOwnProperty(id)) {
        delete bookmark[id];
        console.log("Successfully removed ", petValue);
        localStorage.setItem("bookmark", JSON.stringify(bookmark));
      } else {
        console.log(petValue, "- not found!");
      }
    }
  }
  // Displays the list of bookmarked pets.
  displayBookmarkslist() {
    const readBookmark = localStorage.getItem("bookmark");
    if (!readBookmark) {
      console.log("No bookmarks");
    } else {
      console.log(`
      Your Pet BookMarks
      `);
      const bookmark = JSON.parse(readBookmark);
      console.log(bookmark);
    }
  }
  //update book marked value
  updateBookMarkedPet(pet: Pet) {
    const readBookmark = localStorage.getItem("boolmar");
    if (readBookmark) {
      const bookmark = JSON.parse(readBookmark);
      const id = Object.keys(pet)[0];// assuing we updating first key
      if (bookmark.hasOwnProperty(id)) {
        //update
        const value = Object.values(pet)[0];
        bookmark[id] = value;
        //store in localstorage
        localStorage.setItem("bookmark", JSON.stringify(bookmark));//update at the end
      } else {
        this.bookmarkPet(pet);
      }
    }
  }
  async secoundQuestion(pet: Pet | null) {
    console.log(pet);
    let continueLoop = true;

    while (continueLoop) {
      const options = [
        { title: "Bookmark selected pet", value: "1" },
        { title: "Remove selected pet bookmark list", value: "2" },
        { title: "Display Bookmarks list", value: "3" },
        { title: "Update Book mark list", value: "4" },
        { title: "Search pet prompt", value: "5" },
      ];
      const userInput = await this.selectPrompt(
        "select",
        "Please Select one option:",
        options
      );
      const choiceValue = +userInput.select;

      switch (choiceValue) {
        case 1:
          this.bookmarkPet(pet as Pet);
          break;
        case 2:
          this.removeBookmarkedPet(pet as Pet);
          break;
        case 3:
          this.displayBookmarkslist();
          break;
        case 4:
          this.updateBookMarkedPet(pet as Pet);
          break;
        case 5:
          console.log("=============== Asking 3 questions... ===============");
          this.promptUser();
          continueLoop = false;
          break;
        default:
          console.log("Invalid Choice");
      }
    }
  }
  // Utilizes the prompts library to create a select prompt.
  async selectPrompt(name: string, msg: string, choices: Choice[]) {
    return await prompts({
      type: "select",
      name: name,
      message: msg,
      choices: choices,
    });
  }
  // Prompts the user to select a pet type and gender, then fetches pet data accordingly.
  async promptUser() {
    try {
      if (this.#expireAccessToken < Date.now()) {
        this.requestAccessToken(); // work on it
      }
      const userResponseType = await this.selectPrompt("type", "Pet Type?", [
        { title: "Dog", value: "dog" },
        { title: "Cat", value: "cat" },
      ]);
      const userResponseGender = await this.selectPrompt(
        "gender",
        "Pet Gender?",
        [
          { title: "Male", value: "male" },
          { title: "Female", value: "female" },
        ]
      );
      console.log(
        "You Choices - ",
        userResponseType.type,
        userResponseGender.gender
      );
      this.fetchPetData(userResponseType.type, userResponseGender.gender);// calling fetch here
    } catch (e) {
      console.log("Error: ", e);
    }
  }
  // Initiates the program by reading the local access token and prompting the user.
  async run() {
    this.readLocalAccessToken();
    this.promptUser();
  }
}

const finalProject = new FinalProject();
finalProject.run();
