


<?php


error_reporting(0);
session_start();
include_once 'oesdb.php';
if(!isset($_SESSION['stdname'])) {
    $_GLOBALS['message']="Session Timeout.Click here to <a href=\"index.php\">Re-LogIn</a>";
}
else if(isset($_REQUEST['logout']))
{
    //Log out and redirect login page
    unset($_SESSION['stdname']);
    header('Location: index.php');

}
else if(isset($_REQUEST['dashboard'])){
    //redirect to dashboard
   
     header('Location: stdwelcome.php');

}
if(isset($_SESSION['starttime']))
{
    unset($_SESSION['starttime']);
    unset($_SESSION['endtime']);
    unset($_SESSION['tqn']);
    unset($_SESSION['qn']);
    unset($_SESSION['duration']);
    executeQuery("update studenttest set status='over' where testid=".$_SESSION['testid']." and stdid=".$_SESSION['stdid'].";");
}
?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN"
    "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html>
  <head>
    <title>OES-Test Acknowledgement</title>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/>
    <link rel="stylesheet" type="text/css" href="oes.css"/>
    <script type="text/javascript" src="validate.js" ></script>
    </head>
  <body >
       <?php

        if($_GLOBALS['message']) {
            echo "<div class=\"message\">".$_GLOBALS['message']."</div>";
        }
        ?>
      <div id="container">
      <div class="header">
                <img style="margin:10px 2px 2px 10px;float:left;" height="80" width="200" src="images/logo.png" alt="HS-EXAM"/><h3 class="headtext"> &nbsp; Examination System </h3><h4 style="color:#ffffff;text-align:center;margin:0 0 5px 5px;"><i>...because Examination Matters</i></h4>
            </div>
           <form id="editprofile" action="editprofile.php" method="post">
          <div class="menubar">
               <ul id="menu">
                        <?php if(isset($_SESSION['stdname'])) {
                         // Navigations
                         ?>
                        <li><input type="submit" value="LogOut" name="logout" class="subbtn" title="Log Out"/></li>
                        <li><input type="submit" value="DashBoard" name="dashboard" class="subbtn" title="Dash Board"/></li>
                     
               </ul>
          </div>
		  <!-- Harmeet's Script-->
		      <div class="page">
		   <img alt="back" height="100%" width="100%" style="border:none;" src="images/submit.png" alt="Acknowledgement"/>
			 </div>
		 
			<div class="page">
          <h3 style="font-size:3em ; text-align:center;"><b><a href="viewresult.php">Click Here</a></b></h3>
				<!-- Harmeet's Script-end-->	 
			<?php
                        }
          ?>
      </div>

           </form>
     <div id="footer">
	  <span style="color:#FFFFFF;font-family:'Trebuchet MS';font-size:11px;">Copyright © 2014 by &quot;<strong><b style="color:red">Hyper Soft</b></strong>&quot;&nbsp; ·&nbsp; All Rights reserved</span>
       <p style="font-size:70%;color:#ffffff;"> Developed By-<b>Harmeet $ingh<br/> </p>
	  </div>
      </div>
  </body>
</html>

