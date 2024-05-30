document.addEventListener("DOMContentLoaded", function () {
  const directoryStructure = document.getElementById("directory-structure");
  const pdfFrame = document.getElementById("pdf-frame");
  const pdfControls = document.querySelector(".pdf-controls"); // Select the controls container
  const deletePdfButton = document.querySelector(".control-pdf-btn.delete"); // Select the delete button
  let currentPath = ""; // Variable to store the current path

  // Fetch directory structure
  fetch("/api/structure")
    .then((response) => response.json())
    .then((structure) => {
      directoryStructure.appendChild(createStructure(structure));
    })
    .catch((error) => {
      console.error("Error fetching directory structure:", error);
    });

  function createStructure(items, parentExpanded = true) {
    const container = document.createElement("div");

    items.forEach((item) => {
      const itemElement = document.createElement("div");
      itemElement.classList.add(item.type);

      const button = document.createElement("button");
      button.textContent = item.name;
      itemElement.appendChild(button);

      if (item.type === "folder") {
        const arrow = document.createElement("span");
        arrow.textContent = parentExpanded ? " ▼" : " ▶"; // Keep folder expanded if parent is expanded
        button.appendChild(arrow);

        button.addEventListener("click", () => {
          itemElement.classList.toggle("expanded");
          arrow.textContent = itemElement.classList.contains("expanded")
            ? " ▼"
            : " ▶";
          currentPath = item.path; // Store the current path when folder is clicked
        });

        const childrenContainer = document.createElement("div");
        childrenContainer.classList.add("children");
        childrenContainer.appendChild(
          createStructure(
            item.children,
            parentExpanded && itemElement.classList.contains("expanded")
          )
        ); // Pass parentExpanded && itemElement.classList.contains("expanded")
        itemElement.appendChild(childrenContainer);
      } else if (item.type === "file") {
        button.addEventListener("click", () => {
          viewPDF(item.path);
          showPdfControls(); // Show controls when a PDF is loaded
          currentPath = item.path; // Store the current path when file is clicked
        });
      }

      container.appendChild(itemElement);
    });

    return container;
  }

  function viewPDF(file) {
    const filePath = `/data/${file}`;
    console.log(`Loading PDF: ${filePath}`);
    pdfFrame.src = filePath;
  }

  function showPdfControls() {
    pdfControls.style.display = "flex"; // Show the controls
  }

  // Function to handle replacing the current PDF with another PDF
  document
    .querySelector(".control-pdf-btn.edit")
    .addEventListener("click", () => {
      const fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.accept = "application/pdf";
      fileInput.addEventListener("change", function () {
        const file = this.files[0];
        if (file) {
          replacePDF(file, currentPath); // Use the currentPath variable
        }
      });
      fileInput.click();
    });

  // Function to handle deleting the current PDF
  deletePdfButton.addEventListener("click", () => {
    if (confirm("Are you sure you want to delete this PDF file?")) {
      deletePDF(currentPath); // Pass the currentPath variable
    }
  });

  // Function to replace the current PDF with another PDF
  function replacePDF(file, path) {
    const formData = new FormData();
    formData.append("pdfFile", file);
    formData.append("fileName", file.name);
    formData.append("oldFileName", path);

    fetch("/api/replace-pdf", {
      method: "POST",
      body: formData,
    })
      .then((response) => response.json())
      .then((data) => {
        console.log("PDF file replaced successfully:", data);
        // Reload the PDF viewer
        pdfFrame.src = data.path;
        refreshDirectoryStructure();
      })
      .catch((error) => {
        console.error("Error replacing PDF file:", error);
      });
  }

  // Function to delete the current PDF
  function deletePDF(path) {
    fetch(`/api/delete-pdf/${path.replace("/", "-")}`, {
      method: "DELETE",
    })
      .then((response) => response.json())
      .then((data) => {
        console.log("PDF file deleted successfully:", data);
        // Reload the directory structure after deleting the PDF file
        refreshDirectoryStructure();
      })
      .catch((error) => {
        console.error("Error deleting PDF file:", error);
      });
  }

  // Function to refresh the directory structure
  function refreshDirectoryStructure() {
    // Clear the existing directory structure
    directoryStructure.innerHTML = "";
    // Fetch and display the updated directory structure
    fetch("/api/structure")
      .then((response) => response.json())
      .then((structure) => {
        directoryStructure.appendChild(createStructure(structure));
      })
      .catch((error) => {
        console.error("Error fetching directory structure:", error);
      });
  }
});
