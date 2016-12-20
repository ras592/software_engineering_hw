## Protected Chat Application

### Installation Instructions (Git)
<iframe title="Installation with Git" width="560" height="315" src="https://www.youtube.com/embed/Ds4Zy8Ara4k" frameborder="0" allowfullscreen></iframe>
<br>
<iframe title="Downloading without Git" width="560" height="315" src="https://www.youtube.com/embed/X3g2ptupuZk" frameborder="0" allowfullscreen></iframe>

Github Repository https://github.com/ras592/software_engineering_hw

1. Clone the repository

    ```shell
    > git clone https://github.com/ras592/software_engineering_hw.git
    ```
2. "cd" into newly created directory

    ```shell
    > cd software_engineering_hw/
    ```
3. Run npm install

    ```shell
    > npm install
    ```
4. In a new terminal window run the MongoDB daemon.

    ```shell
    > mongod
    ```
5. Restore the MongoDB data from dump data.

    ```shell
    > mongorestore
    ```
6. Run the server with Node.js

    ```shell
    > node server.js
    ```
7. Open in a web browser the application at localhost:3000

Links for downloads:
- https://nodejs.org/en/
- https://www.mongodb.com/download-center?jmp=nav#community
