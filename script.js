
const recommendBtn = document.getElementById("recommendBtn");

recommendBtn.addEventListener("click", async function () {
    const education = document.getElementById("education").value.trim();
    const skills = document.getElementById("skills").value.trim();
    const interests = document.getElementById("interests").value.trim();
    const experience = document.getElementById("experience").value;

    const resultText = document.getElementById("resultText");
    const careerTitle = document.getElementById("careerTitle");
    const missingSkillsList = document.getElementById("missingSkillsList");
    const roadmapList = document.getElementById("roadmapList");

    // Validate form fields
    if (!education || !skills || !interests || !experience) {
        alert("Please fill all the details.");
        return;
    }

    const originalButtonText = recommendBtn.textContent;

    recommendBtn.disabled = true;
    recommendBtn.textContent = "Analyzing...";

    resultText.textContent = "Analyzing your profile...";
    careerTitle.textContent = "Finding your career path...";

    missingSkillsList.innerHTML = "";
    roadmapList.innerHTML = "";

    const oldSuggestions = document.getElementById("careerSuggestions");
    if (oldSuggestions) {
        oldSuggestions.innerHTML = "";
    }

    try {
        // Request main career recommendation
        const response = await fetch(
            "http://localhost:5000/api/recommend",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    education,
                    skills,
                    interests,
                    experience
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || "Unable to generate recommendations."
            );
        }

        // Display main recommendation
        careerTitle.textContent =
            data.career || "Career suggestion unavailable";

        resultText.textContent =
            data.message || "Your career analysis is ready!";

        // Create Other Career Options section
        let careerSuggestions =
            document.getElementById("careerSuggestions");

        if (!careerSuggestions) {
            const heading = document.createElement("h3");
            heading.textContent = "Other Career Options";

            careerSuggestions = document.createElement("ul");
            careerSuggestions.id = "careerSuggestions";

            careerTitle.insertAdjacentElement("afterend", heading);
            heading.insertAdjacentElement("afterend", careerSuggestions);
        }

        careerSuggestions.innerHTML = "";

        const careerOptions = Array.isArray(data.careerSuggestions)
            ? data.careerSuggestions
            : [];

        // Make every career option clickable
        careerOptions.filter(Boolean).forEach((career) => {
            const li = document.createElement("li");
            const button = document.createElement("button");

            button.type = "button";
            button.textContent = career;
            button.className = "career-option-btn";

            const detailsBox = document.createElement("div");
            detailsBox.className = "career-details";
            detailsBox.hidden = true;

            let detailsLoaded = false;
            let isLoading = false;

            button.addEventListener("click", async () => {
                // Close details if already open
                if (!detailsBox.hidden) {
                    detailsBox.hidden = true;
                    return;
                }

                detailsBox.hidden = false;

                // Reuse details already loaded
                if (detailsLoaded) {
                    return;
                }

                // Prevent duplicate requests
                if (isLoading) {
                    return;
                }

                isLoading = true;
                button.disabled = true;
                detailsBox.textContent = "Loading career details...";

                try {
                    const detailsResponse = await fetch(
                        "http://localhost:5000/api/career-details",
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                career,
                                education,
                                skills,
                                interests,
                                experience
                            })
                        }
                    );

                    const details = await detailsResponse.json();

                    if (!detailsResponse.ok) {
                        throw new Error(
                            details.message ||
                            "Unable to load career details."
                        );
                    }

                    // Safely build detail sections
                    detailsBox.innerHTML = "";

                    function addSection(title, content) {
                        const section = document.createElement("section");
                        const heading = document.createElement("h4");

                        heading.textContent = title;
                        section.appendChild(heading);

                        if (Array.isArray(content)) {
                            const list = document.createElement("ul");

                            content.forEach((item) => {
                                const listItem = document.createElement("li");
                                listItem.textContent = item;
                                list.appendChild(listItem);
                            });

                            section.appendChild(list);
                        } else {
                            const paragraph = document.createElement("p");
                            paragraph.textContent =
                                content || "Information unavailable.";
                            section.appendChild(paragraph);
                        }

                        detailsBox.appendChild(section);
                    }

                    addSection(
                        "About This Career",
                        details.description
                    );

                    addSection(
                        "Required Skills",
                        details.requiredSkills
                    );

                    addSection(
                        "Possible Job Roles",
                        details.jobRoles
                    );

                    addSection(
                        "Learning Roadmap",
                        details.roadmap
                    );

                    detailsLoaded = true;

                } catch (error) {
                    console.error("Career details error:", error);

                    detailsBox.textContent =
                        error.message === "Failed to fetch"
                            ? "Unable to connect to the server. Please try again."
                            : error.message ||
                              "Could not load career details.";
                } finally {
                    isLoading = false;
                    button.disabled = false;
                }
            });

            li.appendChild(button);
            li.appendChild(detailsBox);
            careerSuggestions.appendChild(li);
        });

        // Display missing skills
        const missingSkills = Array.isArray(data.missingSkills)
            ? data.missingSkills
            : [];

        if (missingSkills.length > 0) {
            missingSkills.forEach((skill) => {
                const li = document.createElement("li");
                li.textContent = skill;
                missingSkillsList.appendChild(li);
            });
        } else {
            missingSkillsList.textContent =
                "No skill suggestions available.";
        }

        // Display main career roadmap
        const roadmap = Array.isArray(data.roadmap)
            ? data.roadmap
            : [];

        if (roadmap.length > 0) {
            roadmap.forEach((step) => {
                const li = document.createElement("li");
                li.textContent = step;
                roadmapList.appendChild(li);
            });
        } else {
            roadmapList.textContent = "No roadmap available yet.";
        }

    } catch (error) {
        careerTitle.textContent = "Recommendation unavailable";

        resultText.textContent =
            error.message === "Failed to fetch"
                ? "Unable to connect to the server. Please check that your backend is running."
                : error.message || "Something went wrong. Please try again.";

        console.error("Recommendation error:", error);

    } finally {
        recommendBtn.disabled = false;
        recommendBtn.textContent = originalButtonText;
    }
});