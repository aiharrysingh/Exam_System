



 <?php

      error_reporting(0);
      session_start();
      include_once 'oesdb.php';
/***************************** Step 1 : Case 1 ****************************/
 //redirect to registration page
      if(isset($_REQUEST['register']))
      {
            header('Location: register.php');
      }
      else if($_REQUEST['stdsubmit'])
      {
/***************************** Step 1 : Case 2 ****************************/
 //Perform Authentication
          $result=executeQuery("select *,DECODE(stdpassword,'oespass') as std from student where stdname='".htmlspecialchars($_REQUEST['name'],ENT_QUOTES)."' and stdpassword=ENCODE('".htmlspecialchars($_REQUEST['password'],ENT_QUOTES)."','oespass')");
          if(mysql_num_rows($result)>0)
          {

              $r=mysql_fetch_array($result);
              if(strcmp(htmlspecialchars_decode($r['std'],ENT_QUOTES),(htmlspecialchars($_REQUEST['password'],ENT_QUOTES)))==0)
              {
                  $_SESSION['stdname']=htmlspecialchars_decode($r['stdname'],ENT_QUOTES);
                  $_SESSION['stdid']=$r['stdid'];
                  unset($_GLOBALS['message']);
                  header('Location: stdwelcome.php');
              }else
          {
              $_GLOBALS['message']="Check Your user name and Password.";
          }

          }
          else
          {
              $_GLOBALS['message']="Check Your user name and Password.";
          }
          closedb();
      }
 ?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN"
    "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html>
  <head>
    <title>HS-Examination System</title>
      <!--****************-->
   <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
	<link rel="stylesheet" type="text/css" href="styles.css" />
	  <!--****************-->
  </head>
  <body>
      <!--******header**********-->   
	  <br/><br/>
<div id="carbonForm">
	<img style="float:left;height:130px; width:250px; " src="images/logo.png" alt="HS-VER"/><br/><br/><br/>
	<h6>...Student Login Page</h6> 
	 <form id="stdloginform" action="index.php" method="post"  >
	 <hr color="white">
	 <div style="text-align:right ;">
		 <h3><a href="tc/index.php" title="Only for Official use of study centre.">(Study Center Login)</a> </h3>
		 <h3> <a href="register.php" title="Click here  to Register">Register</a></h3>  </div>
	<hr color="white">
	<br />
	<!--Harmeet -tc login-->  
	<div class="fieldContainer">
				
       <div class="formRow">
            <div class="label">
             <label for="email">Student&nbsp;Id:</label>
            </div>            
            <div class="field">
                <input type="text" tabindex="1" name="name" value="" />
            </div>
        </div>
        
        <div class="formRow">
            <div class="label">
               <label for="pass">Password:</label>
            </div>        
            <div class="field">
				<input type="password" tabindex="2" name="password" value="" />
            </div>
        </div>
		
		<!-- Sign UP -->
		<div class="signupButton">
        <!----loginbutton-<input type="submit" tabindex="3" value="Log In" name="stdsubmit" class="subbtn" /> -->       
		 <input type="submit" tabindex="3" Value="Log In" name="stdsubmit" id="submit" />
		 </div>
	</div>
	<!--Harmeet script-->
		
		<div style="background:white;"><font size="4px" color="red" 
		>
		<?php

        if(isset($_GLOBALS['message']))
        {
         echo "<div class=\"message\">".$_GLOBALS['message']."</div>";
        }
      ?></font></div>

		<!--****************-->
		 
                    <?php if(isset($_SESSION['stdname'])){
                          header('Location: stdwelcome.php');}else{  
                      ?>
		<!--/***************************** Step 2 ****************************/-->			  
               
      		<?php } ?>

		
       </form>
	   </div> </div>	
<!--footer-->
   <div class="fieldContainer" style="text-align:center ; font-size:85%">
	 <p> Copyright © 2014 by &quot;<strong><b style="color:red">Hyper Soft</b></strong>&quot;&nbsp; ·&nbsp; All Rights reserved</span>
     </p>  <p> Developed By-<b>Harmeet $ingh<br/> </p>
	  </div> 
<script type="text/javascript" src="http://ajax.googleapis.com/ajax/libs/jquery/1.4.2/jquery.min.js"></script>
<script type="text/javascript" src="script.js"></script>

  </body>
</html>
